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
import { ActiveInserterTrackerPlugin } from "../control-logic/inserter/plugins/active-inserter-tracker-plugin";
import { InserterTransferTrackerPlugin } from "../control-logic/inserter/plugins/inserter-transfer-tracker-plugin";

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

export interface SimulationStatistics {
    simulation_time_ms: number;
    simulated_ticks: number;
}

export interface CraftingSequence {
    craft_events: CraftEvent[];
    snapshots_per_tick: TickSnapshot[];
    inserter_transfers: Map<EntityId, InserterTransfer[]>;
    inserter_active_ranges: Map<EntityId, OpenRange[]> ;
    total_duration: Duration;
    statistics?: SimulationStatistics
}

function createEmpty(): CraftingSequence {
    return {
        craft_events: [],
        snapshots_per_tick: [],
        inserter_transfers: new Map(),
        inserter_active_ranges: new Map(),
        total_duration: Duration.ofTicks(0),
        statistics: undefined,
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
    const inserter_transfers: Map<EntityId, InserterTransfer[]> = new Map();
    const inserter_active_ranges: Map<EntityId, OpenRange[]> = new Map();

    const primaryMachineState = machine_state_machine.machine_state;
    let sim_craft_index: number = 1;

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

    inserterStateMachines.forEach(inserter_state_machine => {

        const source_id = inserter_state_machine.inserter_state.inserter.source.entity_id;
        const primary_machine_id = machine_state_machine.machine_state.machine.entity_id;

        inserter_state_machine.addHandContentsChangePlugin((oldContents, newContents) => {
            const id = inserter_state_machine.entity_id;

            if (!newContents) {
                return;
            }

            let message = `${id} \t held_item "${newContents?.item_name}"=${newContents?.quantity}`

            if (source_id.id === primary_machine_id.id) {
                debugLog(chalk.magentaBright(message));
                return;
            }
            debugLog(chalk.dim(message));
        })


        inserter_state_machine.addPlugin({
            onTransition(fromMode, transition) {
                const id = inserter_state_machine.entity_id;
                const new_status = transition.toMode.status;
                let message = `${id} \t status=${new_status} \t reason="${transition.reason}`;

                if (source_id.id === machine_state_machine.machine_state.machine.entity_id.id) {
                    debugLog(chalk.magentaBright(message));
                    return;
                }

                debugLog(chalk.dim(message));
            },
        })

        inserter_state_machine.addPlugin(new ActiveInserterTrackerPlugin(
            tickProvider,
            (active_range) => {
                const ranges = inserter_active_ranges.get(inserter_state_machine.entity_id) ?? []
                ranges.push(active_range)
                inserter_active_ranges.set(inserter_state_machine.entity_id, ranges);
            }
        ))

        inserter_state_machine.addPlugin(new InserterTransferTrackerPlugin(tickProvider, inserter_state_machine.inserter_state, (snapshot) => {
            const ranges = inserter_transfers.get(inserter_state_machine.entity_id) ?? []
            console.log(snapshot)
            ranges.push({
                item_name: snapshot.item_name,
                tick_range: snapshot.tick_range
            })
            inserter_transfers.set(inserter_state_machine.entity_id, ranges);
        }))
    });

    machine_state_machine.addPlugin({
        onTransition(fromMode, transition) {
            const state = machine_state_machine.machine_state;
            const id = state.machine.entity_id.id;
            const new_status = transition.toMode.status;
            debugLog(chalk.yellow(`${id} \t ${fromMode.status} -> ${new_status} reason=${transition.reason}`));
        }
    });

    machine_state_machine.addCraftEventPlugin(tickProvider, ({ craft_ticks, state }) => {
        const id = state.machine.entity_id.id;
        let message = `${id} \t craft event #${sim_craft_index}:`;

        state.machine.inputs.forEach((input) => {
            const input_quantity = state.inventoryState.getQuantity(input.ingredient.name);
            message += ` \t "${input.ingredient.name}"=${input_quantity}`;
        });

        const output_quantity = state.inventoryState.getQuantity(state.machine.output.ingredient.name);
        const output_name = state.machine.output.ingredient.name;
        message += ` \t "${output_name}"=${output_quantity}`;
        debugLog(chalk.green(message));
        crafts.push({
            craft_index: sim_craft_index,
            machine_state: MachineState.clone(state),
            tick_range: craft_ticks
        });
        sim_craft_index += 1;
    })

    const controlLogic = new CompositeControlLogic([
        new TickControlLogic(tickProvider),
        machine_state_machine,
        ...inserterStateMachines,
    ])

    const start_sim_time = Date.now()
    const start_tick = tickProvider.getCurrentTick();

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

    const end_sim_time = Date.now()
    const sim_duration_ms = end_sim_time - start_sim_time;

    return {
        craft_events: crafts,
        snapshots_per_tick: snapshots_per_tick,
        inserter_transfers: inserter_transfers,
        inserter_active_ranges: inserter_active_ranges,
        total_duration: Duration.ofTicks(
            Math.max(...crafts.map(craft => craft.tick_range.end_inclusive))
        ),
        statistics: {
            simulated_ticks: tickProvider.getCurrentTick() - start_tick,
            simulation_time_ms: sim_duration_ms,
        }
    }

}

function reduceInserterTransferRanges(
    craftingSequence: CraftingSequence
): Map<EntityId, OpenRange[]> {

    const inserter_active_ranges: Map<EntityId, OpenRange[]> = new Map();

    for (const [id, transfers] of craftingSequence.inserter_transfers.entries()) {
        const reducedRanges: OpenRange[] = [];
        OpenRange.reduceRanges(transfers.map(t => t.tick_range))
        inserter_active_ranges.set(id, reducedRanges);
    }

    return inserter_active_ranges;
}

export const CraftingSequence = {
    createEmpty: createEmpty,
    simulate: simulate,
    reduceTransferRanges: reduceInserterTransferRanges
}