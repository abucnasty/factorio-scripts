import { OpenRange } from "../data-types/open-range";
import { MachineState } from "../state/machine-state";
import { EntityId } from "../entities";
import { Duration } from "../data-types";
import { InserterState, InserterStatus } from "../state/inserter-state";
import { CompositeControlLogic } from "../control-logic/composite-control-logic";
import { MutableTickProvider } from "../control-logic/current-tick-provider";
import chalk from "chalk"
import { ItemName } from "../data/factorio-data-types";
import { TickControlLogic } from "../control-logic/tick-control-logic";
import { InserterStateMachine } from "../control-logic/inserter/inserter-state-machine";
import { MachineStateMachine } from "../control-logic/machine/machine-state-machine";

export interface CraftEvent {
    machine_state: Readonly<MachineState>;
    tick_range: OpenRange;
    craft_index: number;
}

export interface TickSnapshot {
    tick: number;
    machine_state: MachineState,
    input_blocked: Record<ItemName, boolean>;
    inserter_states: Map<EntityId, InserterState>
}

export interface MachineTickSnapshot {
    tick: number;
    machine_state: MachineState
    input_blocked: Record<string, boolean>;
}

export interface InserterTransfer {
    item_name: string;
    tick_range: OpenRange;
}

export interface CraftingSequence {
    craft_events: CraftEvent[];
    snapshots_per_tick: TickSnapshot[];
    inserter_active_ranges: Map<EntityId, InserterTransfer[]>;
    total_duration: Duration;
}

function createEmpty(): CraftingSequence {
    return {
        craft_events: [],
        snapshots_per_tick: [],
        inserter_active_ranges: new Map(),
        total_duration: Duration.ofTicks(0),
    }
}


function simulate(args: {
    machine_state_machine: MachineStateMachine,
    inserterStateMachines: InserterStateMachine[],
    tickProvider: MutableTickProvider,
    maxTicks?: number,
    debug?: Partial<{
        enabled: boolean,
        relative_tick_mod: number
    }>,
}): CraftingSequence {

    const { machine_state_machine, inserterStateMachines, tickProvider, maxTicks = 1800, debug } = args;
    const crafts: CraftEvent[] = [];
    const snapshots_per_tick: TickSnapshot[] = [];
    const inserter_active_ranges: Map<EntityId, InserterTransfer[]> = new Map();

    const primaryMachineState = machine_state_machine.machine_state;

    let last_craft_end_tick_inclusive: number | null = null;
    let craft_index: number = 1;

    const debugLog = (message: string) => {
        if (!debug?.enabled) {
            return;
        }
        const tick = tickProvider.getCurrentTick();
        const tickPadded = tick.toString().padStart(4, '0');

        let messageOutput = `Tick ${tickPadded}`

        if (debug?.relative_tick_mod) {
            const relativeTick = tick % debug.relative_tick_mod
            messageOutput += ` (${relativeTick.toString().padStart(3, '0')})`
        }



        messageOutput += `: ${message}`
        console.log(messageOutput);
    }

    inserterStateMachines.forEach(stateMachine => {

        stateMachine.addHandContentsChangePlugin((oldContents, newContents) => {
            const id = stateMachine.entity_id;
            if (newContents) {
                debugLog(chalk.dim(`${id} \t held_item "${newContents?.item_name}"=${newContents?.quantity}`));
            }
        })


        stateMachine.addPlugin({
            onTransition(fromMode, transition) {
                const id = stateMachine.entity_id;
                const new_status = transition.toMode.status;
                let message = `${id} \t status=${new_status} \t reason="${transition.reason}`;

                switch (transition.toMode.status) {
                    case InserterStatus.DROP_OFF:
                        debugLog(chalk.blueBright(message));
                        break;
                    case InserterStatus.PICKUP:
                        debugLog(chalk.blueBright(message));
                        break;
                    default:
                        debugLog(chalk.dim(message));
                        break;
                }
            },
        })

        stateMachine.addPlugin({
            onTransition(fromMode, transition) {
                if (fromMode.status === InserterStatus.PICKUP) {
                    const ranges = inserter_active_ranges.get(stateMachine.entity_id) ?? []
                    const tick = tickProvider.getCurrentTick();
                    const state = stateMachine.inserter_state;
                    const { drop, pickup, rotation } = state.inserter.animation;

                    if (transition.toMode.status === InserterStatus.SWING) {
                        ranges.push({
                            item_name: state.held_item?.item_name ?? "unknown",
                            tick_range: OpenRange.from(
                                tick - pickup.ticks,
                                tick + rotation.ticks + drop.ticks + rotation.ticks
                            )
                        });
                    }

                    if (transition.toMode.status === InserterStatus.IDLE) {
                        ranges.push({
                            item_name: state.held_item?.item_name ?? "unknown",
                            tick_range: OpenRange.from(tick - pickup.ticks, tick)
                        });
                    }
                    inserter_active_ranges.set(state.inserter.entity_id, ranges);
                }
            }
        })
    });

    machine_state_machine.addPlugin({
        onTransition(fromMode, transition) {
            const state = machine_state_machine.machine_state;
            const id = state.machine.entity_id.id;
            const new_status = transition.toMode.status;
            debugLog(chalk.yellow(`${id} \t ${fromMode.status} -> ${new_status} reason=${transition.reason}`));
        }
    });

    machine_state_machine.addCraftEventPlugin((craftIndex, state) => {
        const id = state.machine.entity_id.id;
        let message = `${id} \t craft event #${craft_index}:`;

        state.machine.inputs.forEach((input) => {
            const input_quantity = state.inventoryState.getQuantity(input.ingredient.name);
            message += ` \t "${input.ingredient.name}"=${input_quantity}`;
        });

        const output_quantity = state.inventoryState.getQuantity(state.machine.output.ingredient.name);
        const output_name = state.machine.output.ingredient.name;
        message += ` \t "${output_name}"=${output_quantity}`;
        debugLog(chalk.green(message));
        const tick = tickProvider.getCurrentTick();

        const last_craft_tick = last_craft_end_tick_inclusive ??
            (tick - Math.ceil(state.machine.crafting_rate.ticks_per_craft.toDecimal()))
        crafts.push({
            craft_index: craft_index,
            machine_state: MachineState.clone(state),
            tick_range: OpenRange.from(
                last_craft_tick,
                tick
            )
        });
        last_craft_end_tick_inclusive = tick;
        craft_index++;
    })

    const controlLogic = new CompositeControlLogic([
        new TickControlLogic(tickProvider),
        ...inserterStateMachines,
        machine_state_machine,
    ])

    // arbitrary end condition to prevent infinite loops
    while (true) {
        controlLogic.executeForTick();
        if (tickProvider.getCurrentTick() > maxTicks) {
            break;
        }

        const input_blocked: Record<string, boolean> = {};
        const machineStateSnapshot = MachineState.clone(primaryMachineState)
        primaryMachineState.machine.inputs.forEach((input) => {
            input_blocked[input.ingredient.name] = MachineState.machineInputIsBlocked(
                machineStateSnapshot,
                input.ingredient.name
            );
        });

        snapshots_per_tick.push({
            machine_state: machineStateSnapshot,
            tick: tickProvider.getCurrentTick(),
            input_blocked: input_blocked,
            inserter_states: new Map(
                inserterStateMachines.map(it => [it.entity_id, InserterState.clone(it.inserter_state)])
            )
        })
    }

    return {
        craft_events: crafts,
        snapshots_per_tick: snapshots_per_tick,
        inserter_active_ranges: inserter_active_ranges,
        total_duration: Duration.ofTicks(
            Math.max(...crafts.map(craft => craft.tick_range.end_inclusive))
        ),
    }

}

function filter(
    craftingSequence: CraftingSequence,
    filter: (craftEvent: CraftEvent) => boolean
): CraftingSequence {
    const filtered_craft_events = craftingSequence.craft_events.filter(filter);

    const tickRange = filtered_craft_events.reduce<OpenRange>((acc, craft) => {
        if (acc === null) {
            return OpenRange.from(craft.tick_range.start_inclusive, craft.tick_range.end_inclusive);
        }
        const newStart = Math.min(acc.start_inclusive, craft.tick_range.start_inclusive);
        const newEnd = Math.max(acc.end_inclusive, craft.tick_range.end_inclusive);
        return OpenRange.from(newStart, newEnd);
    }, OpenRange.from(Infinity, -Infinity));

    const total_duration = tickRange.duration();

    const inserter_active_ranges: Map<EntityId, InserterTransfer[]> = new Map();
    craftingSequence.inserter_active_ranges.forEach((transfers, inserterId) => {
        const filteredRanges = transfers.filter(it => tickRange.contains(it.tick_range.start_inclusive));
        inserter_active_ranges.set(inserterId, filteredRanges);
    });

    const snapshots_per_tick = craftingSequence.snapshots_per_tick.filter(it => tickRange.contains(it.tick));


    return {
        craft_events: filtered_craft_events,
        snapshots_per_tick: snapshots_per_tick,
        inserter_active_ranges: inserter_active_ranges,
        total_duration: total_duration,
    }
}

function offset(
    craftingSequence: CraftingSequence,
    start_offset: number
): CraftingSequence {
    const offset_craft_events = craftingSequence.craft_events.map(craft => {
        return {
            ...craft,
            tick_range: OpenRange.from(
                craft.tick_range.start_inclusive + start_offset,
                craft.tick_range.end_inclusive + start_offset
            )
        }
    });

    const offset_snapshots_per_tick = craftingSequence.snapshots_per_tick.map(snapshot => {
        return {
            ...snapshot,
            tick: snapshot.tick + start_offset
        }
    });

    const inserter_active_ranges: Map<EntityId, InserterTransfer[]> = new Map();
    craftingSequence.inserter_active_ranges.forEach((transfers, inserterId) => {
        const offsetTransfers = transfers.map(transfer => {
            return {
                ...transfer,
                tick_range: OpenRange.from(
                    transfer.tick_range.start_inclusive + start_offset,
                    transfer.tick_range.end_inclusive + start_offset
                )
            }
        });
        inserter_active_ranges.set(inserterId, offsetTransfers);
    });

    return {
        craft_events: offset_craft_events,
        snapshots_per_tick: offset_snapshots_per_tick,
        inserter_active_ranges: inserter_active_ranges,
        total_duration: craftingSequence.total_duration,
    }
}

function reduceInserterTransferRanges(
    craftingSequence: CraftingSequence
): Map<EntityId, OpenRange[]> {

    const inserter_active_ranges: Map<EntityId, OpenRange[]> = new Map();

    for (const [id, transfers] of craftingSequence.inserter_active_ranges.entries()) {
        const reducedRanges: OpenRange[] = [];
        OpenRange.reduceRanges(transfers.map(t => t.tick_range))
        inserter_active_ranges.set(id, reducedRanges);
    }

    return inserter_active_ranges;
}

export const CraftingSequence = {
    createEmpty: createEmpty,
    simulate: simulate,
    filter: filter,
    offset: offset,
    reduceTransferRanges: reduceInserterTransferRanges
}