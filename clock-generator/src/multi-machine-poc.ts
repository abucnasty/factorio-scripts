import assert from "assert";
import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { DebugPluginFactory } from './crafting/sequence/debug/debug-plugin-factory';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { simulateFromContext, simulateUntilAllMachinesAreOutputBlocked, warmupSimulation } from './crafting/sequence/multi-machine-crafting-sequence';
import { cloneSimulationContextWithInterceptors, SimulationContext } from './crafting/sequence/simulation-context';
import { Duration, OpenRange } from './data-types';
import { Inserter, Machine, ReadableEntityRegistry } from './entities';
import { TargetProductionRate } from "./crafting/target-production-rate";
import { EntityState, MachineState } from "./state";
import { fraction } from "fractionability";
import { createSignalPerInserterBlueprint } from "./crafting/blueprint";
import { encodeBlueprintFile } from "./blueprints/serde";
import { TickProvider } from "./control-logic/current-tick-provider";
import { EntityTransferCountMap } from "./crafting/sequence/cycle/swing-counts";
import { InventoryTransferHistory } from "./control-logic/inventory/inventory-transfer-history";
import { InserterInventoryHistoryPlugin } from "./control-logic/inserter/plugins/inserter-inventory-transfer-plugin";
import { DrillInventoryTransferPlugin } from "./control-logic/drill/plugins/drill-inventory-transfer-plugin";
import { EnableControlFactory } from "./crafting/sequence/interceptors/inserter-enable-control-factory";
import { CraftingCyclePlan } from "./crafting/sequence/cycle/crafting-cycle";

const config: Config = EXAMPLES.STONE_BRICKS_DIRECT_INSERT_MINING;

const debug = DebugSettingsProvider.mutable()

const simulation_context = SimulationContext.fromConfig(config);

simulation_context.machines
    .map(it => it.machine_state.machine)
    .forEach(Machine.printMachineFacts)

let relative_tick = 0;

const relative_tick_provider = TickProvider.offset({
    base: simulation_context.tick_provider,
    offset: () => -1 * relative_tick
});

// debug plugins
const debug_plugin_factory = new DebugPluginFactory(
    relative_tick_provider,
    debug
);

simulation_context.addDebuggerPlugins(debug_plugin_factory);

// inventory transfer tracking plugins
const inventory_transfer_history = new InventoryTransferHistory();
simulation_context.inserters.forEach(it => {
    it.addPlugin(new InserterInventoryHistoryPlugin(
        relative_tick_provider,
        it.inserter_state,
        inventory_transfer_history
    ))
});
simulation_context.drills.forEach(it => {
    it.addPlugin(new DrillInventoryTransferPlugin(
        it.drill_state.drill,
        relative_tick_provider,
        inventory_transfer_history
    ))
})

// simulation until all machines are output blocked
console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

console.log("Pre loading all machines until output blocked...");

debug.disable()
simulateUntilAllMachinesAreOutputBlocked(simulation_context);
inventory_transfer_history.clear();
relative_tick = simulation_context.tick_provider.getCurrentTick();
debug.disable()


// compute target production rate from initial warmup simulation

const target_production_rate = TargetProductionRate.fromConfig(config.target_output);

const output_machine_state_machine = simulation_context.machines.find(it => it.machine_state.machine.output.item_name === target_production_rate.machine_production_rate.item)
assert(output_machine_state_machine !== undefined, `No machine with output item ${target_production_rate.machine_production_rate.item} found`);

const output_inserter = simulation_context.state_registry.getAllStates().filter(EntityState.isInserter).find(it => it.inserter.source.entity_id.id === output_machine_state_machine.machine_state.entity_id.id)
assert(output_inserter !== undefined, `No inserter with source machine ${output_machine_state_machine.machine_state.entity_id} found`)

const crafting_cycle_plan = computeCraftingCyclePlan(
    target_production_rate,
    output_machine_state_machine.machine_state,
    simulation_context.entity_registry,
    output_inserter.inserter,
)



console.log("All machines are output blocked.");

simulation_context.machines.forEach(it => {
    MachineState.print(it.machine_state);
})

const swing_counts = crafting_cycle_plan.entity_transfer_map
EntityTransferCountMap.print(swing_counts)

const recipe_lcm = config.overrides?.lcm ?? EntityTransferCountMap.lcm(swing_counts);

console.log(`Simulation context ingredient LCM: ${recipe_lcm}`);

const enable_control_factory = new EnableControlFactory(
    simulation_context.state_registry,
    crafting_cycle_plan,
    relative_tick_provider
)

// TODO: this really should be cleaned up, this is way too large of a function and encapsulates core logic that should be elsewhere
const new_simulation_context = cloneSimulationContextWithInterceptors(simulation_context, {
    drill: (drill_state) => {
        return enable_control_factory.createForEntityId(drill_state.entity_id);
    },
    inserter: (inserter_state) => {
        return enable_control_factory.createForEntityId(inserter_state.entity_id);
    }
});

const warmup_period: Duration = Duration.ofTicks(crafting_cycle_plan.total_duration.ticks * recipe_lcm * 10);
const duration: Duration = Duration.ofTicks(crafting_cycle_plan.total_duration.ticks * recipe_lcm);

console.log(`Warm up period: ${warmup_period.ticks} ticks`);
console.log(`Simulation period: ${duration.ticks} ticks`);

console.log("Warming up simulation...");
enable_control_factory.getResettableLogic().forEach(it => it.reset());
debug.enable()
const warm_up_start = new Date();
warmupSimulation(new_simulation_context, warmup_period);
const warm_up_end = new Date();
const warm_up_simulation_time = warm_up_end.getTime() - warm_up_start.getTime();
console.log(`Warm up simulation executed ${warmup_period.ticks} ticks in ${warm_up_simulation_time} ms (${(warmup_period.ticks / (warm_up_simulation_time / 1000)).toFixed(2)} UPS)`);
console.log(`Starting simulation for ${duration.ticks} ticks`);
debug.disable()
// logging

inventory_transfer_history.clear();
relative_tick = simulation_context.tick_provider.getCurrentTick();
enable_control_factory.getResettableLogic().forEach(it => it.reset());
debug.disable()
simulateFromContext(new_simulation_context, duration);
debug.disable()
console.log(`Simulation complete`);

const merged_ranges = InventoryTransferHistory.mergeOverlappingRanges(inventory_transfer_history)

const offset_history = InventoryTransferHistory.correctNegativeOffsets(merged_ranges)

const trimmed_history = InventoryTransferHistory.trimEndsToAvoidBackSwingWakeLists(
    offset_history,
    simulation_context.entity_registry
)

const final_history = trimmed_history

// const output_transfers = final_history.getTransfers(output_inserter.entity_id)

// final_history.setRecords(output_inserter.entity_id, output_transfers.map(it => {
//     return {
//         item_name: it.item_name,
//         tick_range: OpenRange.from(
//             it.tick_range.start_inclusive,
//             it.tick_range.end_inclusive
//         )
//     }
// }))

InventoryTransferHistory.print(final_history)

const blueprint = createSignalPerInserterBlueprint(
    output_machine_state_machine.machine_state.machine.output.item_name,
    crafting_cycle_plan,
    duration,
    InventoryTransferHistory.removeDuplicateEntities(final_history),
    simulation_context.entity_registry
)

console.log("----------------------")
console.log(encodeBlueprintFile({
    blueprint: blueprint
}))


/**
 * This function assumes the machine has finished crafting while not having any items pulled out of its inventory
 */
function computeCraftingCyclePlan(
    target_production_rate: TargetProductionRate,
    output_machine_state: MachineState,
    entity_registry: ReadableEntityRegistry,
    output_inserter: Inserter,
): CraftingCyclePlan {

    const output_machine = output_machine_state.machine
    const output_item_name = output_machine.output.item_name
    const output_crafted = output_machine_state.craftCount * output_machine.output.amount_per_craft.toDecimal()
    console.log(`Output machine ${output_machine.entity_id} crafted ${output_crafted} ${output_item_name}`);
    let max_swings_possible = fraction(output_crafted).divide(output_inserter.metadata.stack_size)

    if (config.overrides?.terminal_swing_count !== undefined) {
        max_swings_possible = fraction(config.overrides.terminal_swing_count)
        console.log(`Overriding max swings possible to ${max_swings_possible} due to config override`);
    }

    return CraftingCyclePlan.create(
        target_production_rate,
        entity_registry,
        max_swings_possible,
        config.overrides ?? {}
    )
}