import { OpenRange } from "../../data-types/open-range";
import { MachineState } from "../../state/machine-state";
import { EntityId } from "../../entities";
import { Duration } from "../../data-types";
import { InserterState } from "../../state/inserter-state";
import { CompositeControlLogic } from "../../control-logic/composite-control-logic";
import { MutableTickProvider } from "../../control-logic/current-tick-provider";
import { ItemName } from "../../data/factorio-data-types";
import { TickControlLogic } from "../../control-logic/tick-control-logic";
import { InserterStateMachine } from "../../control-logic/inserter/inserter-state-machine";
import { MachineStateMachine } from "../../control-logic/machine/machine-state-machine";
import { ActiveInserterTrackerPlugin } from "../../control-logic/inserter/plugins/active-inserter-tracker-plugin";
import { InserterTransferTrackerPlugin } from "../../control-logic/inserter/plugins/inserter-transfer-tracker-plugin";
import { DebugSettings } from "./debug/debug-settings";
import { DebugPluginFactory } from "./debug/debug-plugin-factory";
import { DebugSettingsProvider } from "./debug/debug-settings-provider";
import { CraftEvent } from "./models";

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
    debug?: Partial<DebugSettings>,
}): CraftingSequence {
    const { machine_state_machine, inserterStateMachines, tickProvider, maxTicks = 1800, debug } = args;
    const crafts: CraftEvent[] = [];
    const snapshots_per_tick: TickSnapshot[] = [];
    const inserter_transfers: Map<EntityId, InserterTransfer[]> = new Map();
    const inserter_active_ranges: Map<EntityId, OpenRange[]> = new Map();

    const primaryMachineState = machine_state_machine.machine_state;
    let sim_craft_index: number = 1;

    const debug_plugin_factory = new DebugPluginFactory(tickProvider, DebugSettingsProvider.immutable({
        enabled: debug?.enabled ?? false,
        ...debug
    }));

    inserterStateMachines.forEach(inserter_state_machine => {

        inserter_state_machine.addPlugin(debug_plugin_factory.inserterHandContentsChangePlugin(inserter_state_machine));

        inserter_state_machine.addPlugin(debug_plugin_factory.inserterModeChangePlugin(inserter_state_machine));

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

    machine_state_machine.addPlugin(debug_plugin_factory.machineModeChangePlugin(machine_state_machine.machine_state));
    machine_state_machine.addPlugin(debug_plugin_factory.machineCraftEventPlugin(machine_state_machine.machine_state));

    machine_state_machine.addCraftEventPlugin(tickProvider, ({ craft_ticks, state }) => {
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

    while (true) {
        controlLogic.executeForTick();
        if (tickProvider.getCurrentTick() >= maxTicks) {
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