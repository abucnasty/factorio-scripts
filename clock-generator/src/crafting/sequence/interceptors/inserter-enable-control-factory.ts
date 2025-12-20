import assert from "assert";
import { EntityId, Inserter, InserterStackSize, Machine, MiningDrill, miningDrillMaxInsertion } from "../../../entities";
import { EntityTransferCountMap } from "../cycle/swing-counts";
import { AlwaysEnabledControl, EnableControl } from "../../../control-logic/enable-control";
import { assertIsInserterState, assertIsMachineState, BeltState, EntityState, InserterState, MachineState, ReadableEntityStateRegistry } from "../../../state";
import { ItemName } from "../../../data/factorio-data-types";
import { computeSimulationMode, SimulationMode } from "../simulation-mode";
import { CraftingCyclePlan } from "../cycle/crafting-cycle";
import { Duration, OpenRange } from "../../../data-types";
import { Resettable } from "../../../control-logic/resettable";
import { TickProvider } from "../../../control-logic/current-tick-provider";

export class EnableControlFactory {

    private readonly target_output_item_name: string;
    private readonly terminal_machine_state: MachineState;
    private readonly terminal_inserter_state: InserterState;
    private readonly entity_transfer_map: EntityTransferCountMap

    private readonly resettable_logic: Resettable[] = [];

    constructor(
        private readonly entity_state_registry: ReadableEntityStateRegistry,
        private readonly crafting_cycle_plan: CraftingCyclePlan,
        private readonly tick_provider: TickProvider,
    ) {
        this.target_output_item_name = this.crafting_cycle_plan.production_rate.machine_production_rate.item;
        this.entity_transfer_map = this.crafting_cycle_plan.entity_transfer_map;
        this.terminal_machine_state = this.findFinalMachineOrThrow();
        this.terminal_inserter_state = this.findFinalInserterOrThrow();
    }

    public getResettableLogic(): readonly Resettable[] {
        return this.resettable_logic;
    }

    public createForEntityId(entity_id: EntityId): EnableControl {

        const entity_state = this.entity_state_registry.getStateByEntityIdOrThrow(entity_id);
        if (EntityState.isDrill(entity_state)) {
            return this.forDrill(
                entity_state.drill,
                entity_state.drill.sink_id,
            )
        }
        assertIsInserterState(entity_state);

        const source_state = this.entity_state_registry.getSourceStateOrThrow(entity_id);
        const sink_state = this.entity_state_registry.getSinkStateOrThrow(entity_id);

        if (entity_state === this.terminal_inserter_state) {
            // create output inserter control here
            return this.transferCountFromMachine(
                this.terminal_inserter_state,
                this.terminal_machine_state,
            );
        }

        const additional_enable_controls: EnableControl[] = [];

        if (sink_state === this.terminal_machine_state) {
            additional_enable_controls.push(
                this.transferCountToMachine(
                    entity_state,
                    this.terminal_machine_state,
                )
            );
        }


        if (EntityState.isMachine(source_state) && EntityState.isMachine(sink_state)) {
            return EnableControl.all([
                ...additional_enable_controls,
                this.fromMachinetoMachine(entity_state.inserter, source_state, sink_state)
            ]);
        }

        if (EntityState.isBelt(source_state) && EntityState.isMachine(sink_state)) {
            return EnableControl.all([
                ...additional_enable_controls,
                this.fromBeltToMachine(entity_state.inserter, source_state, sink_state)
            ]);
        }

        return AlwaysEnabledControl
    }


    public fromBeltToMachine(
        inserter: Inserter,
        source_state: BeltState,
        sink_state: MachineState,
    ): EnableControl {
        const inserter_filtered_items = inserter.filtered_items;
        const inserter_animation = inserter.animation;
        const time_to_transfer = inserter_animation.pickup_to_drop.ticks
        const belt_item_names = source_state.belt.lanes.map(it => it.ingredient_name)
        const transferred_items = belt_item_names.filter(it => inserter_filtered_items.has(it))
        const buffer_multiplier = 2

        const mode: SimulationMode = computeSimulationMode(sink_state.machine, inserter);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            return AlwaysEnabledControl
        }

        const enable_control = EnableControl.any(
            transferred_items.map(source_item_name => {
                const sink_input = sink_state.machine.inputs.getOrThrow(source_item_name);
                const minimum_required = sink_input.consumption_rate.amount_per_craft
                const automated_insertion_limit = sink_input.automated_insertion_limit.quantity;
                const sink_consumption_per_tick = sink_input.consumption_rate.rate_per_tick;

                return EnableControl.latched({
                    base: EnableControl.lambda(() => {
                        const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                        const sink_quantity_after_transfer = sink_quantity - Math.ceil(sink_consumption_per_tick * time_to_transfer);
                        return sink_quantity_after_transfer < minimum_required * buffer_multiplier
                    }),
                    release: EnableControl.lambda(() => {
                        const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                        return sink_quantity >= automated_insertion_limit
                    })
                })
            })
        )
        return enable_control;
    }

    public fromMachinetoMachine(
        inserter: Inserter,
        source_state: MachineState,
        sink_state: MachineState,
    ): EnableControl {
        const source_item_name = source_state.machine.output.item_name;
        const buffer_multiplier = 2

        const mode: SimulationMode = computeSimulationMode(sink_state.machine, inserter);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            return this.sourceIsGreaterThanStackSize(
                source_state,
                inserter.metadata.stack_size,
            )
        }

        return EnableControl.all(
            [
                this.sourceIsGreaterThanStackSize(
                    source_state,
                    inserter.metadata.stack_size,
                ),
                this.latchedUntilLessThanMinimum(
                    sink_state,
                    source_item_name,
                    buffer_multiplier
                )
            ]
        )
    }

    public forDrill(
        drill: MiningDrill,
        sink_entity_id: EntityId,
    ): EnableControl {
        const sink_state = this.entity_state_registry.getStateByEntityIdOrThrow(sink_entity_id);
        assertIsMachineState(sink_state);
        const sink_machine = sink_state.machine
        const source_item = drill.item
        const source_item_name = source_item.name;
        const sink_input = sink_machine.inputs.getOrThrow(source_item_name);
        const minimum_required = sink_input.consumption_rate.amount_per_craft
        const sink_consumption_per_tick = sink_input.consumption_rate.rate_per_tick;
        const drill_output_per_tick = drill.production_rate.amount_per_tick.toDecimal();
        const time_to_transfer_minimum_amount = Math.ceil(minimum_required / drill_output_per_tick)

        const max_insertion_amount = miningDrillMaxInsertion(drill, sink_machine);

        const ensure_at_least_once_per_cycle = this.clockedForCycle(
            [OpenRange.from(1, 1)]
        )

        return EnableControl.any([
            EnableControl.latched({
                base: EnableControl.any([
                    // ensure_at_least_once_per_cycle,
                    EnableControl.lambda(() => {
                        const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                        const sink_quantity_after_transfer = sink_quantity - Math.ceil(sink_consumption_per_tick * time_to_transfer_minimum_amount);
                        return sink_quantity_after_transfer < minimum_required * 4
                    })
                ]),
                release: EnableControl.lambda(() => {
                    const sink_quantity = sink_state.inventoryState.getItemOrThrow(source_item_name).quantity;
                    return sink_quantity >= max_insertion_amount
                })
            })
        ])
    }

    private transferCountToMachine(
        inserter_state: InserterState,
        sink_state: MachineState,
    ): EnableControl {
        const mode = computeSimulationMode(sink_state.machine, inserter_state.inserter);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            return AlwaysEnabledControl
        }

        if (mode === SimulationMode.PREVENT_DESYNCS) {
            return AlwaysEnabledControl
        }

        if (mode === SimulationMode.NORMAL) {
            return this.clockedForCycle(
                this.computeEnableRangesToMachine(inserter_state, sink_state)
            )
        }
        return AlwaysEnabledControl;
    }

    private transferCountFromMachine(
        inserter_state: InserterState,
        source_state: MachineState,
    ): EnableControl {

        const enabled_range = this.computeEnableRangeFromMachine(
            inserter_state,
            source_state,
        )

        const clocked_control = this.clockedForCycle(
            [
                enabled_range
            ]
        )

        const mode = computeSimulationMode(source_state.machine, inserter_state.inserter);

        if (mode === SimulationMode.NORMAL) {
            return EnableControl.all(
                [
                    clocked_control,
                    this.sourceIsGreaterThanStackSize(
                        source_state,
                        inserter_state.inserter.metadata.stack_size,
                    )
                ]
            )
        }

        return clocked_control;
    }

    private computeEnableRangesToMachine(
        inserter_state: InserterState,
        sink_state: MachineState,
    ): OpenRange[] {
        const transfer_count = this.entity_transfer_map.getOrThrow(inserter_state.inserter.entity_id);
        const animation = inserter_state.inserter.animation;
        const total_transfer_duration = Duration.ofTicks(
            animation.total.ticks * Math.ceil(transfer_count.total_transfer_count.toDecimal())
        );

        const output_inserters_for_sink = this.entity_state_registry
            .getAllStates()
            .filter(EntityState.isInserter)
            .filter(i => i.inserter.source.entity_id.id === sink_state.machine.entity_id.id);

        const output_inserter_enable_ranges = OpenRange.reduceRanges(
            output_inserters_for_sink.map(output_inserter_state => {
                return this.computeEnableRangeFromMachine(
                    output_inserter_state,
                    sink_state,
                )
            })
        );

        const available_enable_ranges = OpenRange.inverse(
            output_inserter_enable_ranges,
            OpenRange.fromStartAndDuration(0, this.crafting_cycle_plan.total_duration.ticks)
        );

        const mode = computeSimulationMode(sink_state.machine, inserter_state.inserter);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            return available_enable_ranges;
        }

        if (mode === SimulationMode.NORMAL) {
            // we want to distribute the inserter swings in the available enable ranges
            // ideally we start from the last enable range and work backwards
            const enabled_ranges: OpenRange[] = [];
            const individual_swing_duration = Duration.ofTicks(animation.total.ticks);
            let remaining_transfer_ticks = total_transfer_duration.ticks;

            for (let i = available_enable_ranges.length - 1; i >= 0; i--) {
                const available_range = available_enable_ranges[i];
                let range_start = available_range.start_inclusive;
                const range_end = available_range.end_inclusive;
                while (remaining_transfer_ticks > 0 && range_start + individual_swing_duration.ticks <= range_end) {
                    enabled_ranges.push(
                        OpenRange.from(
                            range_start,
                            range_start + individual_swing_duration.ticks
                        )
                    );
                    range_start += individual_swing_duration.ticks;
                    remaining_transfer_ticks -= individual_swing_duration.ticks;
                }
            }

            assert(remaining_transfer_ticks <= 0, `Not enough available enable range to fit all inserter transfers for inserter ${inserter_state.inserter.entity_id}`);

            const merged_ranges = OpenRange.reduceRanges(enabled_ranges);
            const sorted_ranges = merged_ranges.sort((a, b) => a.start_inclusive - b.start_inclusive);
            return sorted_ranges;
        }

        // fallback to full duration
        return [
            OpenRange.fromStartAndDuration(0, this.crafting_cycle_plan.total_duration.ticks)
        ]
    }

    private computeEnableRangeFromMachine(
        inserter_state: InserterState,
        source_state: MachineState,
    ): OpenRange {
        const transfer_count = this.entity_transfer_map.getOrThrow(inserter_state.inserter.entity_id);
        const total_transfer_count = Math.ceil(transfer_count.total_transfer_count.toDecimal());
        const animation = inserter_state.inserter.animation;

        const total_swing_duration = Duration.ofTicks(
            (animation.total.ticks + 1) * total_transfer_count
        );


        const mode = computeSimulationMode(source_state.machine, inserter_state.inserter);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks + 4
            )
        }

        if (mode === SimulationMode.PREVENT_DESYNCS) {
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks + 4
            )
        }

        if (mode === SimulationMode.NORMAL) {
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks
            )
        }

        throw new Error(`Unhandled simulation mode ${mode} for inserter ${inserter_state.inserter.entity_id}`);
    }

    private clockedForCycle(enable_ranges: OpenRange[]): EnableControl {
        const clocked_control = EnableControl.clocked({
            periodDuration: this.crafting_cycle_plan.total_duration,
            enabledRanges: [...enable_ranges],
            tickProvider: this.tick_provider,
        })
        this.resettable_logic.push(clocked_control);

        return clocked_control
    }


    private sourceIsGreaterThanStackSize(
        source: MachineState,
        stack_size: InserterStackSize
    ): EnableControl {

        const item_name = source.machine.output.item_name;
        const amount_per_craft = source.machine.output.amount_per_craft;

        return EnableControl.lambda(() => {
            // given that there is a 1 tick delay between an inserter enabling and the item being picked up,
            // we need to check if on the next tick it will have crafted the amount needed
            // we can do this more simply by just assuming it will complete the next tick and add
            // the production amount per craft to the current quantity
            const source_quantity = source.inventoryState.getItemOrThrow(item_name).quantity;
            const source_quantity_after_next_craft = Math.floor(
                amount_per_craft.add(source_quantity).toDecimal()
            )
            return source_quantity_after_next_craft >= stack_size
        })
    }

    public latchedUntilLessThanMinimum(
        sink: MachineState,
        sink_input_item_name: ItemName,
        buffer_multiplier: number = 2
    ): EnableControl {
        const sink_input = sink.machine.inputs.getOrThrow(sink_input_item_name);
        const minimum_required = sink_input.consumption_rate.amount_per_craft
        const automated_insertion_limit = sink_input.automated_insertion_limit.quantity;
        return EnableControl.latched({
            base: EnableControl.lambda(() => {
                const sink_quantity = sink.inventoryState.getItemOrThrow(sink_input_item_name).quantity;
                return sink_quantity <= minimum_required * buffer_multiplier
            }),
            release: EnableControl.lambda(() => {
                const sink_quantity = sink.inventoryState.getItemOrThrow(sink_input_item_name).quantity;
                return sink_quantity >= automated_insertion_limit
            })
        })
    }

    private findFinalMachineOrThrow(): MachineState {
        const final_machine = this.entity_state_registry
            .getAllStates()
            .filter(EntityState.isMachine)
            .find(s => s.machine.output.item_name === this.target_output_item_name);
        assert(final_machine !== undefined,
            `No machine found producing target output item ${this.target_output_item_name}`
        )
        return final_machine;
    }

    private findFinalInserterOrThrow(): InserterState {
        const final_inserter = this.entity_state_registry
            .getAllStates()
            .filter(EntityState.isInserter)
            .find(s => s.inserter.source.entity_id.id === this.terminal_machine_state.entity_id.id);
        assert(final_inserter !== undefined,
            `No inserter found taking output from machine ${this.terminal_machine_state.entity_id}`
        )
        return final_inserter
    }
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