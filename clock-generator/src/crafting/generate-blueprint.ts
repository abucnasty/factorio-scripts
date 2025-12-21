import assert from "assert";
import { Config } from '../config/config';
import { DebugPluginFactory } from './sequence/debug/debug-plugin-factory';
import { DebugSettingsProvider, MutableDebugSettingsProvider } from './sequence/debug/debug-settings-provider';
import { cloneSimulationContextWithInterceptors, SimulationContext } from './sequence/simulation-context';
import { Duration } from '../data-types';
import { Inserter, Machine, ReadableEntityRegistry } from '../entities';
import { TargetProductionRate } from "./target-production-rate";
import { EntityState, MachineState } from "../state";
import { fraction } from "fractionability";
import { createSignalPerInserterBlueprint } from "./blueprint";
import { FactorioBlueprint } from "../blueprints/blueprint";
import { TickProvider } from "../control-logic/current-tick-provider";
import { EntityTransferCountMap } from "./sequence/cycle/swing-counts";
import { InventoryTransferHistory } from "../control-logic/inventory/inventory-transfer-history";
import { InserterInventoryHistoryPlugin } from "../control-logic/inserter/plugins/inserter-inventory-transfer-plugin";
import { DrillInventoryTransferPlugin } from "../control-logic/drill/plugins/drill-inventory-transfer-plugin";
import { EnableControlFactory } from "./sequence/interceptors/inserter-enable-control-factory";
import { CraftingCyclePlan } from "./sequence/cycle/crafting-cycle";
import { PrepareStep } from "./runner/steps/prepare-step";
import { WarmupStep } from "./runner/steps/warmup-step";
import { SimulateStep } from "./runner/steps/simulate-step";

const MAX_SIMULATION_TICKS = 500_000;

export interface BlueprintGenerationResult {
    blueprint: FactorioBlueprint;
    crafting_cycle_plan: CraftingCyclePlan;
    simulation_duration: Duration;
}

/**
 * Generates a blueprint from a configuration using the Runner pattern.
 * 
 * This function encapsulates the three-step process:
 * 1. Prepare: Wait until all machines are output blocked
 * 2. Warm up: Simulate the warm up period to ensure steady state
 * 3. Simulate: Run the final simulation and collect transfer history
 * 
 * @param config The configuration for the simulation
 * @param debug Optional debug settings provider (defaults to disabled)
 * @returns The generated blueprint and related metadata
 */
export function generateClockForConfig(
    config: Config,
    debug: MutableDebugSettingsProvider = DebugSettingsProvider.mutable()
): BlueprintGenerationResult {
    
    // Initialize simulation context
    const simulation_context = SimulationContext.fromConfig(config);
    
    simulation_context.machines
        .map(it => it.machine_state.machine)
        .forEach(Machine.printMachineFacts);

    let relative_tick = 0;

    const relative_tick_provider = TickProvider.offset({
        base: simulation_context.tick_provider,
        offset: () => -1 * relative_tick
    });

    // Add debug plugins
    const debug_plugin_factory = new DebugPluginFactory(
        relative_tick_provider,
        debug
    );
    simulation_context.addDebuggerPlugins(debug_plugin_factory);

    // Add inventory transfer tracking plugins
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
    });

    console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

    // Step 1: Prepare - wait until all machines are output blocked
    console.log("Pre loading all machines until output blocked...");
    debug.disable();
    
    const prepare_step = new PrepareStep(simulation_context);
    prepare_step.execute();
    
    inventory_transfer_history.clear();
    relative_tick = simulation_context.tick_provider.getCurrentTick();
    debug.disable();

    // Compute crafting cycle plan
    const target_production_rate = TargetProductionRate.fromConfig(config.target_output);

    const output_machine_state_machine = simulation_context.machines.find(
        it => it.machine_state.machine.output.item_name === target_production_rate.machine_production_rate.item
    );
    assert(
        output_machine_state_machine !== undefined,
        `No machine with output item ${target_production_rate.machine_production_rate.item} found`
    );

    const output_inserter = simulation_context.state_registry
        .getAllStates()
        .filter(EntityState.isInserter)
        .find(it => it.inserter.source.entity_id.id === output_machine_state_machine.machine_state.entity_id.id);
    assert(
        output_inserter !== undefined,
        `No inserter with source machine ${output_machine_state_machine.machine_state.entity_id} found`
    );

    const crafting_cycle_plan = computeCraftingCyclePlan(
        target_production_rate,
        output_machine_state_machine.machine_state,
        simulation_context.entity_registry,
        output_inserter.inserter,
        config
    );

    console.log("All machines are output blocked.");
    simulation_context.machines.forEach(it => {
        MachineState.print(it.machine_state);
    });

    const swing_counts = crafting_cycle_plan.entity_transfer_map;
    EntityTransferCountMap.print(swing_counts);

    const recipe_lcm = config.overrides?.lcm ?? EntityTransferCountMap.lcm(swing_counts);
    console.log(`Simulation context ingredient LCM: ${recipe_lcm}`);

    // Create enable control factory
    const enable_control_factory = new EnableControlFactory(
        simulation_context.state_registry,
        crafting_cycle_plan,
        relative_tick_provider
    );

    // Clone simulation context with interceptors
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

    assert(warmup_period.ticks < MAX_SIMULATION_TICKS, `Warmup period of ${warmup_period.ticks} ticks exceeds maximum allowed ${MAX_SIMULATION_TICKS} ticks`);

    console.log(`Warm up period: ${warmup_period.ticks} ticks`);
    console.log(`Simulation period: ${duration.ticks} ticks`);

    // Step 2: Warm up
    console.log("Warming up simulation...");
    enable_control_factory.getResettableLogic().forEach(it => it.reset());
    debug.disable();
    
    const warmup_step = new WarmupStep(new_simulation_context, warmup_period);
    warmup_step.execute();
    
    debug.disable();

    // Step 3: Simulate
    console.log(`Starting simulation for ${duration.ticks} ticks`);
    inventory_transfer_history.clear();
    relative_tick = simulation_context.tick_provider.getCurrentTick();
    enable_control_factory.getResettableLogic().forEach(it => it.reset());
    
    const simulate_step = new SimulateStep(new_simulation_context, duration);
    debug.disable();
    simulate_step.execute();
    debug.disable();
    
    console.log(`Simulation complete`);

    // Process transfer history
    const merged_ranges = InventoryTransferHistory.mergeOverlappingRanges(inventory_transfer_history);
    const offset_history = InventoryTransferHistory.correctNegativeOffsets(merged_ranges);
    const trimmed_history = InventoryTransferHistory.trimEndsToAvoidBackSwingWakeLists(
        offset_history,
        simulation_context.entity_registry
    );
    const final_history = trimmed_history;

    InventoryTransferHistory.print(final_history);

    // Create blueprint
    const blueprint = createSignalPerInserterBlueprint(
        output_machine_state_machine.machine_state.machine.output.item_name,
        crafting_cycle_plan,
        duration,
        InventoryTransferHistory.removeDuplicateEntities(final_history),
        simulation_context.entity_registry
    );

    return {
        blueprint,
        crafting_cycle_plan,
        simulation_duration: duration
    };
}

/**
 * Helper function to compute the crafting cycle plan.
 * This function assumes the machine has finished crafting while not having any items pulled out of its inventory.
 */
function computeCraftingCyclePlan(
    target_production_rate: TargetProductionRate,
    output_machine_state: MachineState,
    entity_registry: ReadableEntityRegistry,
    output_inserter: Inserter,
    config: Config
): CraftingCyclePlan {

    const output_machine = output_machine_state.machine;
    const output_item_name = output_machine.output.item_name;
    const output_crafted = output_machine_state.craftCount * output_machine.output.amount_per_craft.toDecimal();
    console.log(`Output machine ${output_machine.entity_id} crafted ${output_crafted} ${output_item_name}`);
    
    let max_swings_possible = fraction(output_crafted).divide(output_inserter.metadata.stack_size);

    if (config.overrides?.terminal_swing_count !== undefined) {
        max_swings_possible = fraction(config.overrides.terminal_swing_count);
        console.log(`Overriding max swings possible to ${max_swings_possible} due to config override`);
    }

    return CraftingCyclePlan.create(
        target_production_rate,
        entity_registry,
        max_swings_possible,
        config.overrides ?? {}
    );
}
