import assert from "assert";
import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { InserterTransferTrackerPlugin } from './control-logic/inserter/plugins/inserter-transfer-tracker-plugin';
import { DebugPluginFactory } from './crafting/sequence/debug/debug-plugin-factory';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { simulateFromContext, simulateUntilAllMachinesAreOutputBlocked } from './crafting/sequence/multi-machine-crafting-sequence';
import { cloneSimulationContextWithInterceptors, createSimulationContextFromConfig } from './crafting/sequence/simulation-context';
import { InserterTransfer } from './crafting/sequence/single-crafting-sequence';
import { Duration, OpenRange } from './data-types';
import { EntityId, Inserter, Machine } from './entities';
import { printInserterTransfers } from './generator';
import { AlwaysEnabledControl, EnableControl, EnableControlLambda } from "./control-logic/enable-control";
import { TargetProductionRate } from "./crafting/target-production-rate";
import { EntityState, MachineState } from "./state";
import { fraction } from "fractionability";
import { createSignalPerInserterBlueprint } from "./crafting/blueprint";
import { encodeBlueprintFile } from "./blueprints/serde";

const config: Config = EXAMPLES.ELECTRIC_FURNACE_CONFIG;

const debug = DebugSettingsProvider.mutable()

const simulation_context = createSimulationContextFromConfig(config);

simulation_context.machines.forEach(it => {
    Machine.printMachineFacts(it.machine_state.machine);
})


// debug plugins
const debug_plugin_factory = new DebugPluginFactory(
    simulation_context.tick_provider,
    debug
);
simulation_context.machines.forEach(it => {
    it.addPlugin(debug_plugin_factory.machineModeChangePlugin(it.machine_state));
    it.addPlugin(debug_plugin_factory.machineCraftEventPlugin(it.machine_state));
});
simulation_context.inserters.forEach(it => {
    it.addPlugin(debug_plugin_factory.inserterModeChangePlugin(it));
    it.addPlugin(debug_plugin_factory.inserterHandContentsChangePlugin(it));
});

simulation_context.drills.forEach(it => {
    it.addPlugin(debug_plugin_factory.drillModeChangePlugin(it.drill_state))
})

// inserter transfer tracking
const inserter_transfers: Map<EntityId, InserterTransfer[]> = new Map();

let offset_tick = 0;

simulation_context.inserters.forEach(it => {
    it.addPlugin(new InserterTransferTrackerPlugin(simulation_context.tick_provider, it.inserter_state, (snapshot) => {
        const ranges = inserter_transfers.get(it.entity_id) ?? []
        ranges.push({
            item_name: snapshot.item_name,
            tick_range: OpenRange.from(
                snapshot.tick_range.start_inclusive - offset_tick,
                snapshot.tick_range.end_inclusive - offset_tick
            ),
        })
        inserter_transfers.set(it.entity_id, ranges);
    }))
});

// simulation

console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

console.log("Pre loading all machines until output blocked...");

debug.disable()
simulateUntilAllMachinesAreOutputBlocked(simulation_context);
inserter_transfers.clear();
offset_tick = simulation_context.tick_provider.getCurrentTick();
debug.disable()

const target_production_rate = TargetProductionRate.fromConfig(config.target_output);

const output_machine_state_machine = simulation_context.machines.find(it => it.machine_state.machine.output.item_name === target_production_rate.machine_production_rate.item)
assert(output_machine_state_machine !== undefined, `No machine with output item ${target_production_rate.machine_production_rate.item} found`);

const output_inserter = simulation_context.state_registry.getAllStates().filter(EntityState.isInserter).find(it => it.inserter.source.entity_id.id === output_machine_state_machine.machine_state.entity_id.id)
assert(output_inserter !== undefined, `No inserter with source machine ${output_machine_state_machine.machine_state.entity_id} found`)

const output_inserter_period = computeOutputInserterPeriod(
    target_production_rate,
    output_machine_state_machine.machine_state,
    output_inserter.inserter,
)

console.log("All machines are output blocked. Starting warm up simulation...");

console.log("Warming up simulation...");

const swing_duration = output_inserter.inserter.animation.total.ticks
const buffer = Math.floor(output_machine_state_machine.machine_state.machine.crafting_rate.ticks_per_craft)

const output_period_enabled_range = OpenRange.from(
    0,
    swing_duration + buffer,
)


const new_simulation_context = cloneSimulationContextWithInterceptors(simulation_context, {
    drill: (drill_state, sink_state) => {
        return EnableControl.lambda(() => {
            const item = drill_state.drill.item
            const machine_input = sink_state.machine.inputs.get(item.name)
            assert(machine_input !== undefined, `Machine ${sink_state.machine.entity_id} does not have an input for item ${item.name}`)
            const current_sink_quantity = sink_state.inventoryState.getItemOrThrow(item.name).quantity
            return current_sink_quantity < machine_input.automated_insertion_limit.quantity
        })
    },
    inserter: (inserter_state, source_state, sink_state) => {

        // output inserter control
        if (source_state.entity_id.id === output_machine_state_machine.machine_state.entity_id.id) {
            console.log(
                `Output Inserter ${inserter_state.inserter.entity_id} will be enabled`
                + ` for ${output_period_enabled_range.start_inclusive} to ${output_period_enabled_range.end_inclusive} ticks`
                + ` every ${output_inserter_period.ticks} ticks `
            )
            return EnableControl.periodic({
                periodDuration: output_inserter_period,
                enabledRanges: [
                    output_period_enabled_range
                ],
                tickProvider: simulation_context.tick_provider,
            })
        }

        if (sink_state.entity_id.id === output_machine_state_machine.machine_state.entity_id.id) {
            return EnableControl.all(
                [
                    EnableControl.lambda(() => {
                        if (EntityState.isBelt(source_state)) {
                            return true
                        }

                        if (EntityState.isMachine(source_state)) {
                            const item_name = source_state.machine.output.item_name;
                            const current_quantity = source_state.inventoryState.getItemOrThrow(item_name).quantity;
                            return current_quantity >= inserter_state.inserter.metadata.stack_size
                        }
                        return true
                    }),
                    EnableControl.periodic({
                        periodDuration: output_inserter_period,
                        enabledRanges: [
                            OpenRange.from(
                                output_period_enabled_range.end_inclusive,
                                output_inserter_period.ticks
                            )
                        ],
                        tickProvider: simulation_context.tick_provider,
                    })
                ]
            )
        }

        return AlwaysEnabledControl
    }
});

const warmup_period: Duration = Duration.ofTicks(output_inserter_period.ticks * 18);
const duration: Duration = Duration.ofTicks(output_inserter_period.ticks * 9);

debug.disable()
const warm_up_start = new Date();
simulateFromContext(new_simulation_context, warmup_period);
const warm_up_end = new Date();
const warm_up_simulation_time = warm_up_end.getTime() - warm_up_start.getTime();
console.log(`Warm up simulation executed ${warmup_period.ticks} ticks in ${warm_up_simulation_time} ms (${(warmup_period.ticks / (warm_up_simulation_time / 1000)).toFixed(2)} UPS)`);
console.log(`Starting simulation for ${duration.ticks} ticks`);
debug.disable()
// logging

inserter_transfers.clear();
offset_tick = simulation_context.tick_provider.getCurrentTick() - 1;

debug.disable()
simulateFromContext(new_simulation_context, duration);
debug.disable()
console.log(`Simulation complete`);

const merged_ranges = mergeOverlappingInserterRanges(inserter_transfers, buffer * 1.5)

const output_ranges = merged_ranges.get(output_inserter.entity_id)!

const primary_machine_inputs = Array.from(output_machine_state_machine.machine_state.machine.inputs.values())

if (primary_machine_inputs.some(it => it.automated_insertion_limit.quantity < output_inserter.inserter.metadata.stack_size)) {
    // add a pickup buffer to deal with desyncs for machines with automated insertions less than the stack size of the output inserter
    merged_ranges.set(output_inserter.entity_id, output_ranges.map(it => {
        return {
            item_name: it.item_name,
            tick_range: OpenRange.from(
                it.tick_range.start_inclusive,
                it.tick_range.end_inclusive + buffer
            )
        }
    }))
}



printInserterTransfers(merged_ranges)

const blueprint = createSignalPerInserterBlueprint(
    output_machine_state_machine.machine_state.machine.output.item_name,
    duration,
    merged_ranges,
    simulation_context.entity_registry
)

console.log("----------------------")
console.log(encodeBlueprintFile({
    blueprint: blueprint
}))



/**
 * This function assumes the machine has finished crafting while not having any items pulled out of its inventory
 */
function computeOutputInserterPeriod(
    target_production_rate: TargetProductionRate,
    output_machine_state: MachineState,
    output_inserter: Inserter,
): Duration {
    const output_machine = output_machine_state.machine
    const output_item_name = output_machine.output.item_name
    const output_crafted = output_machine_state.craftCount * output_machine.output.amount_per_craft.toDecimal()
    console.log(`Output machine ${output_machine.entity_id} crafted ${output_crafted} ${output_item_name}`);
    const max_swings_possible = fraction(output_crafted).divide(output_inserter.metadata.stack_size)

    const crafting_sequence_duration = Duration.ofTicks(
        output_machine.crafting_rate.ticks_per_craft * output_machine_state.craftCount
    )

    const target_output_duration = Duration.ofTicks(
        fraction(output_inserter.metadata.stack_size).divide(target_production_rate.machine_production_rate.amount_per_tick).toDecimal()
    )

    console.log(`Output Inserter ${output_inserter.entity_id} can perform a maximum of ${max_swings_possible.toDecimal()} swings over ${crafting_sequence_duration.ticks.toFixed(3)} ticks.`)

    const limited_swings = Math.floor(max_swings_possible.toDecimal())

    const final_period_duration = Duration.ofTicks(target_output_duration.ticks * limited_swings)

    console.log(`Output Inserter ${output_inserter.entity_id} will be limited to ${limited_swings} swing(s) every ${final_period_duration.ticks} ticks to meet the target production of ${target_production_rate.machine_production_rate.amount_per_second} ${output_item_name} / second`)

    return final_period_duration
}

function mergeOverlappingInserterRanges(original: Map<EntityId, InserterTransfer[]>, overlap_threshold: number = 1): Map<EntityId, InserterTransfer[]> {
    const result: Map<EntityId, InserterTransfer[]> = new Map();

    original.forEach((ranges, entityId) => {

        const by_item: Map<string, InserterTransfer[]> = new Map()

        ranges.forEach(it => {
            const transfers = by_item.get(it.item_name) ?? []
            by_item.set(it.item_name, transfers.concat(it))
        })

        by_item.forEach((ranges, itemName) => {
            const merged_ranges: InserterTransfer[] = OpenRange.reduceRanges(ranges.map(it => it.tick_range), overlap_threshold).map(it => {
                return {
                    item_name: itemName,
                    tick_range: it,
                }
            })
            const existing_ranges = result.get(entityId) ?? []
            result.set(entityId, existing_ranges.concat(merged_ranges))
        })
    })

    return result
}