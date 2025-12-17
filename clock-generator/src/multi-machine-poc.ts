import assert from "assert";
import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { DebugPluginFactory } from './crafting/sequence/debug/debug-plugin-factory';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { simulateFromContext, simulateUntilAllMachinesAreOutputBlocked, warmupSimulation } from './crafting/sequence/multi-machine-crafting-sequence';
import { cloneSimulationContextWithInterceptors, createSimulationContextFromConfig, SimulationContext } from './crafting/sequence/simulation-context';
import { Duration, OpenRange } from './data-types';
import { Entity, Inserter, Machine, miningDrillMaxInsertion } from './entities';
import { AlwaysEnabledControl, ClockedEnableControl, EnableControl } from "./control-logic/enable-control";
import { TargetProductionRate } from "./crafting/target-production-rate";
import { assertIsMachineState, EntityState, MachineState, MachineStatus } from "./state";
import { fraction } from "fractionability";
import { createSignalPerInserterBlueprint } from "./crafting/blueprint";
import { encodeBlueprintFile } from "./blueprints/serde";
import { TickProvider } from "./control-logic/current-tick-provider";
import { computeLastSwingOffsetDuration, computeSimulationMode, SimulationMode } from "./crafting/sequence";
import { EntityTransferCountMap } from "./crafting/sequence/cycle/swing-counts";
import { MaxSwingCount } from "./crafting/sequence/cycle/inserter-crafting-period";
import { InventoryTransferHistory } from "./control-logic/inventory/inventory-transfer-history";
import { InserterInventoryHistoryPlugin } from "./control-logic/inserter/plugins/inserter-inventory-transfer-plugin";
import { DrillInventoryTransferPlugin } from "./control-logic/drill/plugins/drill-inventory-transfer-plugin";

const config: Config = EXAMPLES.LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG;

const debug = DebugSettingsProvider.mutable()

const simulation_context = createSimulationContextFromConfig(config);

simulation_context.machines.forEach(it => {
    Machine.printMachineFacts(it.machine_state.machine);
})

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

// inventory transfer tracking
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

// simulation
console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

console.log("Pre loading all machines until output blocked...");

debug.disable()
simulateUntilAllMachinesAreOutputBlocked(simulation_context);
inventory_transfer_history.clear();
relative_tick = simulation_context.tick_provider.getCurrentTick();
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

console.log("All machines are output blocked.");

const clocks: ClockedEnableControl[] = []

simulation_context.machines.forEach(it => {
    MachineState.print(it.machine_state);
})

const swing_counts = EntityTransferCountMap.create(
    output_machine_state_machine.machine_state.machine,
    simulation_context.entity_registry,
    fraction(output_inserter_period.swing_count),
    output_inserter.inserter.metadata.stack_size
)

EntityTransferCountMap.print(swing_counts)

const recipe_lcm = EntityTransferCountMap.lcm(swing_counts);

console.log(`Simulation context ingredient LCM: ${recipe_lcm}`);

// TODO: this really should be cleaned up, this is way too large of a function and encapsulates core logic that should be elsewhere
const new_simulation_context = cloneSimulationContextWithInterceptors(simulation_context, {
    drill: (drill_state, sink_state) => {
        const source_item = drill_state.drill.item
        const source_item_name = source_item.name;
        const sink_input = sink_state.machine.inputs.get(source_item_name);
        assert(sink_input !== undefined, `Machine ${sink_state.machine.entity_id} does not have an input for item ${source_item_name}`);
        const minimum_required = sink_input.consumption_rate.amount_per_craft
        const sink_consumption_per_tick = sink_input.consumption_rate.rate_per_tick;
        const drill_output_per_tick = drill_state.drill.production_rate.amount_per_tick.toDecimal();
        const time_to_transfer_minimum_amount = Math.ceil(minimum_required / drill_output_per_tick)

        const max_insertion_amount = miningDrillMaxInsertion(drill_state.drill, sink_state.machine);

        const ensure_at_least_once_per_cycle = EnableControl.clocked({
            enabledRanges: [OpenRange.from(0, 1)],
            periodDuration: output_inserter_period.crafting_period,
            tickProvider: simulation_context.tick_provider,
        })

        clocks.push(ensure_at_least_once_per_cycle)

        return EnableControl.any([
            EnableControl.latched({
                base: EnableControl.any([
                    ensure_at_least_once_per_cycle,
                    EnableControl.lambda(() => {
                        const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                        const sink_quantity_after_transfer = sink_quantity - Math.ceil(sink_consumption_per_tick * time_to_transfer_minimum_amount);
                        return sink_quantity_after_transfer < minimum_required * 3
                    })
                ]),
                release: EnableControl.lambda(() => {
                    const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                    return sink_quantity >= max_insertion_amount
                })
            })
        ])
    },
    inserter: (inserter_state, source_state, sink_state) => {

        const target_output_item_name = simulation_context.target_production_rate.total_production_rate.item

        const primary_output_machine = simulation_context.entity_registry
            .getAll()
            .filter(Entity.isMachine)
            .find(m => m.output.item_name === target_output_item_name);

        assert(primary_output_machine !== undefined, `No machine found producing target output item ${target_output_item_name}`)

        const primary_output_inserter = simulation_context.entity_registry
            .getAll()
            .filter(Entity.isInserter)
            .find(i => i.source.entity_id.id === primary_output_machine.entity_id.id);

        assert(primary_output_inserter !== undefined, `No inserter found taking output from machine ${primary_output_machine.entity_id}`)

        const max_output_inserter_swing_count = output_inserter_period.swing_count

        const cycle_count = output_inserter_period.swing_count
        const total_cycle = output_inserter_period.crafting_period.ticks
        const cycle_duration = Math.ceil(total_cycle / cycle_count)
        const cycle_period = OpenRange.fromStartAndDuration(0, cycle_duration + 1)
        const cycle_period_duration = cycle_period.duration()

        const max_swing_count_for_inserter = MaxSwingCount.forInserter(
            inserter_state.entity_id,
            EntityTransferCountMap.divide(swing_counts, fraction(output_inserter_period.swing_count)),
            simulation_context.entity_registry
        ).max_swing_count

        // output inserter control
        if (source_state.entity_id.id === primary_output_machine.entity_id.id) {

            console.log(`Configuring output inserter ${inserter_state.inserter.entity_id} control logic...`)
            console.log(`Output Inserter control ranges over ${output_inserter_period.crafting_period.ticks} ticks:`)
            output_inserter_period.enabled_ranges.forEach(range => {
                console.log(`- Enabled from ${range.start_inclusive} to ${range.end_inclusive} ticks`);
            })

            assertIsMachineState(source_state);

            const clocked_control = EnableControl.clocked({
                periodDuration: output_inserter_period.crafting_period,
                enabledRanges: output_inserter_period.enabled_ranges,
                tickProvider: simulation_context.tick_provider,
            })

            const machine_is_output_full = EnableControl.lambda(() => {
                return source_state.status === MachineStatus.OUTPUT_FULL
            })

            const output_quantity_is_above_stack_size = EnableControl.lambda(() => {
                const item_name = source_state.machine.output.item_name;
                const current_quantity = source_state.inventoryState.getItemOrThrow(item_name).quantity;
                return current_quantity >= inserter_state.inserter.metadata.stack_size
            })

            clocks.push(clocked_control);

            return EnableControl.all(
                [
                    clocked_control,
                    // machine_is_output_full,
                    // output_quantity_is_above_stack_size,
                ],
            )
        }

        const additional_enable_controls: EnableControl[] = []

        if (sink_state.entity_id.id === primary_output_machine.entity_id.id) {
            assertIsMachineState(sink_state);
            const mode = computeSimulationMode(sink_state.machine, inserter_state.inserter);

            if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
                const total_period = OpenRange.fromStartAndDuration(0, output_inserter_period.crafting_period.ticks)
                const enabled_ranges = OpenRange.inverse(output_inserter_period.enabled_ranges, total_period)
                const clocked_control = EnableControl.clocked({
                    periodDuration: output_inserter_period.crafting_period,
                    enabledRanges: enabled_ranges,
                    tickProvider: simulation_context.tick_provider,
                })
                clocks.push(clocked_control);
                additional_enable_controls.push(
                    clocked_control
                );
            }

            if (mode === SimulationMode.NORMAL) {
                // const clocked_max_swing = MaxSwingCountEnableControl.create_clocked({
                //     max_swing_count: max_swing_count_for_inserter,
                //     periodDuration: cycle_period_duration,
                //     tick_provider: simulation_context.tick_provider,
                //     inserter_status_provider: () => inserter_state.status,
                //     reset_ranges: [OpenRange.from(0, 0)],
                // })
                // clocks.push(clocked_max_swing)

                const inserter_transfer_duration = Duration.ofTicks(
                    Math.ceil(max_swing_count_for_inserter * inserter_state.inserter.animation.total.ticks)
                )

                const output_inserter_duration = Duration.ofTicks(
                    max_output_inserter_swing_count * primary_output_inserter.animation.total.ticks
                )

                let start_tick = output_inserter_duration.ticks;
                let end_tick = start_tick + inserter_transfer_duration.ticks;

                if (end_tick > cycle_period_duration.ticks) {
                    start_tick = cycle_period_duration.ticks - inserter_transfer_duration.ticks;
                    end_tick = cycle_period_duration.ticks;
                }

                const enabled_ranges: OpenRange[] = [
                    OpenRange.from(
                        start_tick,
                        end_tick
                    )
                ]

                const clocked_control = EnableControl.clocked({
                    periodDuration: cycle_period_duration,
                    enabledRanges: enabled_ranges,
                    tickProvider: simulation_context.tick_provider,
                })

                clocks.push(clocked_control);
                additional_enable_controls.push(clocked_control)
            }
        }



        if (EntityState.isBelt(source_state) && EntityState.isMachine(sink_state)) {
            const inserter_filtered_items = inserter_state.inserter.filtered_items;
            const belt_item_names = source_state.belt.lanes.map(it => it.ingredient_name)
            const transferred_items = belt_item_names.filter(it => inserter_filtered_items.has(it))
            const inserter_animation = inserter_state.inserter.animation;

            const time_to_transfer = inserter_animation.pickup_to_drop.ticks

            const mode = computeSimulationMode(sink_state.machine, inserter_state.inserter);

            if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
                return EnableControl.all(additional_enable_controls)
            }

            const enable_control = EnableControl.any(
                transferred_items.map(source_item_name => {
                    const sink_input = sink_state.machine.inputs.get(source_item_name);
                    assert(sink_input !== undefined, `Machine ${sink_state.machine.entity_id} does not have an input for item ${source_item_name}`);
                    const minimum_required = sink_input.consumption_rate.amount_per_craft
                    const automated_insertion_limit = sink_input.automated_insertion_limit.quantity;
                    const sink_consumption_per_tick = sink_input.consumption_rate.rate_per_tick;

                    return EnableControl.latched({
                        base: EnableControl.lambda(() => {
                            const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                            const sink_quantity_after_transfer = sink_quantity - Math.ceil(sink_consumption_per_tick * time_to_transfer);
                            return sink_quantity_after_transfer < minimum_required * 2
                        }),
                        release: EnableControl.lambda(() => {
                            const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                            return sink_quantity >= automated_insertion_limit
                        })
                    })
                })
            )

            return EnableControl.all(
                additional_enable_controls.concat(enable_control)
            )
        }

        if (EntityState.isMachine(source_state) && EntityState.isMachine(sink_state)) {

            const source_item_name = source_state.machine.output.item_name;
            const sink_input = sink_state.machine.inputs.get(source_item_name);
            assert(sink_input !== undefined, `Machine ${sink_state.machine.entity_id} does not have an input for item ${source_item_name}`);

            const minimum_required = sink_input.consumption_rate.amount_per_craft

            const automated_insertion_limit = sink_input.automated_insertion_limit.quantity;

            const mode = computeSimulationMode(sink_state.machine, inserter_state.inserter);

            const source_is_greater_than_stack_size = EnableControl.lambda(() => {
                const source_quantity = source_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                return source_quantity >= inserter_state.inserter.metadata.stack_size
            })

            const latched_until_less_than_minimimum = EnableControl.latched({
                base: EnableControl.lambda(() => {
                    const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                    return sink_quantity <= minimum_required * 2
                }),
                release: EnableControl.lambda(() => {
                    const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                    return sink_quantity >= automated_insertion_limit
                })
            })

            if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
                return EnableControl.all(
                    additional_enable_controls.concat(
                        source_is_greater_than_stack_size
                    )
                )
            }

            return EnableControl.all(
                additional_enable_controls.concat(
                    source_is_greater_than_stack_size,
                    latched_until_less_than_minimimum
                )
            )
        }

        return AlwaysEnabledControl
    }
});

const amount_in_output_machine = output_machine_state_machine.machine_state.inventoryState.getQuantity(output_machine_state_machine.machine_state.machine.output.item_name);
const swings_to_remove = Math.floor(amount_in_output_machine / output_inserter.inserter.metadata.stack_size);

const warmup_period: Duration = Duration.ofTicks(output_inserter_period.crafting_period.ticks * recipe_lcm * 10);
const duration: Duration = Duration.ofTicks(output_inserter_period.crafting_period.ticks * recipe_lcm);

console.log(`Warm up period: ${warmup_period.ticks} ticks`);
console.log(`Simulation period: ${duration.ticks} ticks`);

console.log("Warming up simulation...");
clocks.forEach(it => it.reset());
debug.disable()
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
clocks.forEach(it => it.reset());
debug.disable()
simulateFromContext(new_simulation_context, duration);
debug.disable()
console.log(`Simulation complete`);

const buffer = computeInserterBufferForReality(
    output_machine_state_machine.machine_state.machine,
    output_inserter.inserter
);

const last_swing_offset_duration: Duration = computeLastSwingOffsetDuration(
    output_machine_state_machine.machine_state.machine,
    output_inserter.inserter
)

const merged_ranges = InventoryTransferHistory.mergeOverlappingRanges(inventory_transfer_history)

const offset_history = InventoryTransferHistory.correctNegativeOffsets(InventoryTransferHistory.mergeOverlappingRanges(inventory_transfer_history))

const output_transfers = merged_ranges.getTransfers(output_inserter.entity_id)

offset_history.setRecords(output_inserter.entity_id, output_transfers.map(it => {
    return {
        item_name: it.item_name,
        tick_range: OpenRange.from(
            it.tick_range.start_inclusive,
            it.tick_range.end_inclusive + buffer.ticks - last_swing_offset_duration.ticks
        )
    }
}))

InventoryTransferHistory.print(offset_history)

const blueprint = createSignalPerInserterBlueprint(
    output_machine_state_machine.machine_state.machine.output.item_name,
    {
        cycle_duration: output_inserter_period.crafting_period,
        swing_counts: swing_counts
    },
    duration,
    InventoryTransferHistory.removeDuplicateEntities(offset_history),
    simulation_context.entity_registry
)

console.log("----------------------")
console.log(encodeBlueprintFile({
    blueprint: blueprint
}))


interface OutputInserterCraftingPeriod {
    inserter: Inserter;
    crafting_period: Duration;
    swing_count: number;
    item_name: string;
    enabled_ranges: OpenRange[]
}

function computeInserterBufferForSimulation(
    source_machine: Machine,
    inserter: Inserter
): Duration {
    const mode = computeSimulationMode(source_machine, inserter);

    if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
        return Duration.ofTicks(1);
    }

    if (mode === SimulationMode.PREVENT_DESYNCS) {
        return inserter.animation.pickup
    }

    return Duration.zero
}

function computeInserterBufferForReality(
    source_machine: Machine,
    inserter: Inserter
): Duration {
    const mode = computeSimulationMode(source_machine, inserter);

    if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
        return Duration.ofTicks(
            Math.floor(source_machine.crafting_rate.ticks_per_craft)
        );
    }

    if (mode === SimulationMode.PREVENT_DESYNCS) {
        return inserter.animation.pickup
    }

    return Duration.zero
}


/**
 * This function assumes the machine has finished crafting while not having any items pulled out of its inventory
 */
function computeOutputInserterPeriod(
    target_production_rate: TargetProductionRate,
    output_machine_state: MachineState,
    output_inserter: Inserter,
): OutputInserterCraftingPeriod {
    const output_machine = output_machine_state.machine
    const output_item_name = output_machine.output.item_name
    const output_crafted = output_machine_state.craftCount * output_machine.output.amount_per_craft.toDecimal()
    console.log(`Output machine ${output_machine.entity_id} crafted ${output_crafted} ${output_item_name}`);
    let max_swings_possible = fraction(output_crafted).divide(output_inserter.metadata.stack_size)

    const crafting_sequence_duration = Duration.ofTicks(
        output_machine.crafting_rate.ticks_per_craft * output_machine_state.craftCount
    )

    const single_swing_period_duration = Duration.ofTicks(
        fraction(output_inserter.metadata.stack_size).divide(target_production_rate.machine_production_rate.amount_per_tick).toDecimal()
    )

    console.log(`Output Inserter ${output_inserter.entity_id} can perform a maximum of ${max_swings_possible} (${max_swings_possible.toDecimal()}) swings over ${crafting_sequence_duration.ticks.toFixed(3)} ticks.`)

    const buffer = computeInserterBufferForSimulation(
        output_machine,
        output_inserter
    )

    if (max_swings_possible.getDenominator === 1) {
        // simple case
        const total_swing_duration = (output_inserter.animation.total.ticks + 1) * max_swings_possible.getNumerator
        return {
            crafting_period: Duration.ofTicks(
                single_swing_period_duration.ticks * max_swings_possible.getNumerator
            ),
            inserter: output_inserter,
            swing_count: max_swings_possible.getNumerator,
            item_name: output_item_name,
            enabled_ranges: [
                OpenRange.from(
                    0,
                    total_swing_duration + buffer.ticks
                )
            ]
        }
    }

    if (max_swings_possible.toDecimal() >= 2) {
        const total_swings = Math.floor(max_swings_possible.toDecimal())

        const total_swing_duration = (output_inserter.animation.total.ticks + 1) * total_swings

        return {
            crafting_period: Duration.ofTicks(
                single_swing_period_duration.ticks * total_swings
            ),
            inserter: output_inserter,
            swing_count: total_swings,
            item_name: output_item_name,
            enabled_ranges: [
                OpenRange.from(
                    0,
                    total_swing_duration + buffer.ticks
                )
            ]
        }
    }

    // for only single swing outputs are supported when max swings are less than 2
    // in order to support fractional swings, the timing is going to have to be scheduled based on the crafting
    // speed of the machine in order for it to be fully stable
    max_swings_possible = fraction(1)

    const enabled_ranges: OpenRange[] = []

    const single_swing_period = single_swing_period_duration.ticks
    const numerator = max_swings_possible.getNumerator
    const denominator = max_swings_possible.getDenominator

    for (let i = 0; i < denominator; i++) {
        // if the max_swings_possible is lets say 3/2 for example, we need to enable the inserter for 1 swing the first [target_output_duration.ticks] which would be index 0
        // on index 1, we enable the inserter for 2 swings
        const swings_this_period = Math.floor((i + 1) * numerator / denominator) - Math.floor(i * numerator / denominator);

        if (swings_this_period > 0) {
            const start_tick = i * single_swing_period;
            const swing_duration = output_inserter.animation.total.ticks * swings_this_period;
            const end_tick = start_tick + swing_duration
            enabled_ranges.push(
                OpenRange.from(
                    start_tick,
                    end_tick + buffer.ticks
                )
            )
        }
    }
    const final_period_duration = Duration.ofTicks(single_swing_period_duration.ticks * max_swings_possible.getNumerator)

    console.log(`Output Inserter ${output_inserter.entity_id} will be limited to ${max_swings_possible} swing(s) every ${final_period_duration.ticks} ticks to meet the target production of ${target_production_rate.machine_production_rate.amount_per_second} ${output_item_name} / second`)

    return {
        crafting_period: final_period_duration,
        inserter: output_inserter,
        swing_count: max_swings_possible.getNumerator,
        item_name: output_item_name,
        enabled_ranges: enabled_ranges
    }
}