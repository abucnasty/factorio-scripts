import assert from "../../../common/assert";
import { EntityId, Inserter, InserterStackSize, Machine, MiningDrill, miningDrillMaxInsertion } from "../../../entities";
import { EntityTransferCountMap } from "../cycle/swing-counts";
import { AlwaysEnabledControl, EnableControl, ResettableRegistry, TickProvider } from "../../../control-logic";
import { assertIsInserterState, assertIsMachineState, BeltState, EntityState, InserterState, MachineState, ReadableEntityStateRegistry } from "../../../state";
import { ItemName } from "../../../data";
import { computeSimulationMode, SimulationMode, simulationModeForInput } from "../simulation-mode";
import { CraftingCyclePlan } from "../cycle/crafting-cycle";
import { Duration, OpenRange } from "../../../data-types";

export class EnableControlFactory {

    private readonly target_output_item_name: string;
    private readonly terminal_machine_states: Set<MachineState>;
    private readonly terminal_inserter_states: Set<InserterState>;
    private readonly entity_transfer_map: EntityTransferCountMap

    constructor(
        private readonly entity_state_registry: ReadableEntityStateRegistry,
        private readonly crafting_cycle_plan: CraftingCyclePlan,
        private readonly tick_provider: TickProvider,
        private readonly resettable_registry: ResettableRegistry
    ) {
        this.target_output_item_name = this.crafting_cycle_plan.production_rate.machine_production_rate.item;
        this.entity_transfer_map = this.crafting_cycle_plan.entity_transfer_map;
        this.terminal_machine_states = this.findFinalMachines();
        this.terminal_inserter_states = this.findFinalInserters();
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

        // Check if this is a terminal output inserter
        if (this.terminal_inserter_states.has(entity_state)) {
            // Find the corresponding terminal machine for this inserter
            const terminal_machine = this.findTerminalMachineForInserter(entity_state);
            return this.transferCountFromMachine(
                entity_state,
                terminal_machine,
            );
        }

        const additional_enable_controls: EnableControl[] = [];

        // Check if this inserter feeds into any terminal machine
        if (EntityState.isMachine(sink_state) && this.terminal_machine_states.has(sink_state)) {
            additional_enable_controls.push(
                this.transferCountToMachine(
                    entity_state,
                    sink_state,
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

        const mode: SimulationMode = computeSimulationMode(
            sink_state.machine, 
            inserter,
            this.entity_transfer_map.getOrThrow(inserter.entity_id),
        );

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

        const mode: SimulationMode = computeSimulationMode(
            sink_state.machine,
            inserter,
            this.entity_transfer_map.getOrThrow(inserter.entity_id),
        );

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
                    ensure_at_least_once_per_cycle,
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

    /**
     * Determines if a machine requires clocked control for input inserters due to fast crafting.
     * Fast-crafting machines can complete multiple crafts during one insertion window
     * 
     * This is a beta feature and is a guess on how to decide if we should clock or keep always enabled
     */
    private shouldUseClockedControlForInputs(inserter: Inserter, machine: Machine): boolean {
        const insertion_duration = machine.insertion_duration.tick_duration.toDecimal();
        const transfer_count = this.entity_transfer_map.getOrThrow(inserter.entity_id);
        const total_transfer_duration = inserter.animation.total.ticks * Math.ceil(transfer_count.total_transfer_count.toDecimal());

        const ratios_are_all_equal = new Set(transfer_count.item_transfers.map(it => it.transfer_count.toDecimal())).size === 1;
        if (!ratios_are_all_equal) {
            return false;
        }

        return total_transfer_duration > insertion_duration
    }

    private transferCountToMachine(
        inserter_state: InserterState,
        sink_state: MachineState,
    ): EnableControl {
        const mode = simulationModeForInput(inserter_state.inserter, sink_state.machine);

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            if (this.shouldUseClockedControlForInputs(inserter_state.inserter, sink_state.machine)) {
                return this.clockedForCycle(
                    this.computeEnableRangesToMachine(inserter_state, sink_state)
                )
            }
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

        const mode = computeSimulationMode(
            source_state.machine,
            inserter_state.inserter,
            this.entity_transfer_map.getOrThrow(inserter_state.inserter.entity_id),
        );

        // For NORMAL mode, always add the inventory check
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

        // For PREVENT_DESYNCS, use clocked control only (no inventory check)
        // The clocked timing should be sufficient
        if (mode === SimulationMode.PREVENT_DESYNCS) {
            return clocked_control;
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

        const primitive_enable_control = true

        if (primitive_enable_control) {
            const enabled_ranges: OpenRange[] = output_inserter_enable_ranges.map(range => {
                const output_inserter_end = range.end_inclusive - 1;
                const end_of_cycle = this.crafting_cycle_plan.total_duration.ticks;

                let start_tick = output_inserter_end
                let end_tick = start_tick + total_transfer_duration.ticks

                if (end_tick > end_of_cycle) {
                    start_tick = end_of_cycle - total_transfer_duration.ticks;
                    end_tick = end_of_cycle;
                }
                return OpenRange.from(start_tick, end_tick);
            })
            const merged_ranges = OpenRange.reduceRanges(enabled_ranges);
            const sorted_ranges = merged_ranges.sort((a, b) => a.start_inclusive - b.start_inclusive);

            return sorted_ranges;
        }

        if (!primitive_enable_control) {
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

    /**
     * Calculates the tick at which the source machine will have produced a full stack of items.
     * Used for the "buffer in hand" strategy where the inserter picks up items at the end
     * of the cycle (when they're ready) and drops them at the start of the next cycle.
     */
    private ticksToProduceStack(
        source_machine: Machine,
        stack_size: number,
    ): number {
        const amount_per_craft = source_machine.output.amount_per_craft.toDecimal();
        const ticks_per_craft = source_machine.crafting_rate.ticks_per_craft;

        const crafts_for_stack = Math.ceil(stack_size / amount_per_craft);
        const ticks_to_full_stack = Math.ceil(crafts_for_stack * ticks_per_craft);

        return ticks_to_full_stack;
    }

    /**
     * Determines if the machine is "slow" relative to the inserter's needs.
     * A slow machine cannot produce items fast enough to sustain the inserter's
     * pickup rate, meaning items won't be ready at the start of the cycle.
     * 
     * We compare: ticks_to_produce_first_stack vs enable_window_start
     * If producing a full stack takes longer than the enable window allows,
     * we need to use buffer-in-hand strategy.
     */
    private isSlowMachine(
        source_machine: Machine,
        inserter: Inserter,
        total_transfer_count: number,
    ): boolean {
        const stack_size = inserter.metadata.stack_size;
        const ticks_to_stack = this.ticksToProduceStack(source_machine, stack_size);
        const cycle_duration = this.crafting_cycle_plan.total_duration.ticks;
        
        // Check if this is a fractional swing case (cycle produces less than a full stack).
        // In fractional swing cases, the cycle duration is artificially shorter than what 
        // the machine can produce, and we should NOT apply buffer-in-hand strategy.
        // Instead, we let the inserter start at tick 0 and pick up whatever is available.
        //
        // We detect this by checking if ticks_to_stack significantly exceeds cycle_duration
        // but the continuous rate shows we're producing items (not a truly slow machine).
        // A truly slow machine has ticks_to_stack > cycle_duration * total_transfer_count.
        // A fractional swing case has ticks_to_stack slightly > cycle_duration but the 
        // items actually fit within the larger timing window.
        const items_produced_per_cycle = (source_machine.output.amount_per_craft.toDecimal() / source_machine.crafting_rate.ticks_per_craft) * cycle_duration;
        
        // If the continuous rate produces at least a stack, but discrete timing takes
        // slightly longer than the cycle, this is a fractional case - not slow machine.
        // The key insight: if items_produced_per_cycle >= stack_size, the machine is 
        // "fast enough" in continuous terms, just discrete timing doesn't align perfectly.
        if (items_produced_per_cycle >= stack_size && ticks_to_stack <= cycle_duration * 1.2) {
            // Fractional swing case or near-match - don't use buffer-in-hand
            return false;
        }
        
        if (items_produced_per_cycle < stack_size) {
            // Fractional swing case - not a "slow machine", just an intentionally short cycle
            return false;
        }
        
        // A machine is "slow" if it can't produce a full stack within the cycle duration.
        // This means the inserter would need to start late in the cycle (or wrap around)
        // to pick up items, requiring the buffer-in-hand strategy.
        //
        // For single swing: slow if ticks_to_stack > cycle_duration
        // For multiple swings: slow if total items needed > items produced per cycle
        if (total_transfer_count <= 1) {
            return ticks_to_stack > cycle_duration;
        }
        
        // Multiple swings: slow if machine can't keep up with continuous pickup
        const total_items_needed = stack_size * total_transfer_count;
        
        // Machine is slow if it can't produce enough items in one cycle
        return items_produced_per_cycle < total_items_needed;
    }

    private computeEnableRangeFromMachine(
        inserter_state: InserterState,
        source_state: MachineState,
    ): OpenRange {
        const transfer_count = this.entity_transfer_map.getOrThrow(inserter_state.inserter.entity_id);
        const total_transfer_count = Math.ceil(transfer_count.total_transfer_count.toDecimal());
        const animation = inserter_state.inserter.animation;

        const mode = computeSimulationMode(
            source_state.machine,
            inserter_state.inserter,
            this.entity_transfer_map.getOrThrow(inserter_state.inserter.entity_id),
        );

        if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
            const total_swing_duration = Duration.ofTicks(
                (animation.total.ticks + 1) * total_transfer_count
            );
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks + 4
            )
        }

        if (mode === SimulationMode.PREVENT_DESYNCS) {
            const total_swing_duration = Duration.ofTicks(
                (animation.total.ticks + 1) * total_transfer_count
            );
            
            // For slow machines, use "buffer in hand" strategy:
            // The inserter starts when items will be ready for the first pickup.
            // Subsequent swings happen as items continue to be produced.
            // The enable window may wrap around the cycle boundary.
            if (this.isSlowMachine(source_state.machine, inserter_state.inserter, total_transfer_count)) {
                const cycle_duration = this.crafting_cycle_plan.total_duration.ticks;
                const stack_size = inserter_state.inserter.metadata.stack_size;
                const ticks_to_stack = this.ticksToProduceStack(source_state.machine, stack_size);
                
                // Calculate when the inserter should start (when first stack is ready)
                // The inserter is already at the source after its previous swing, so when 
                // enabled it will immediately go to IDLE and start PICKUP on the next tick.
                // We add +1 buffer because the craft event and pickup happen on the same tick,
                // and we need items to be in the output before pickup begins.
                //
                // If ticks_to_stack exceeds cycle_duration, wrap around to the start of the cycle.
                // This handles the edge case where the machine can't produce a full stack in one cycle.
                const raw_pickup_start = Math.max(0, ticks_to_stack + 1);
                const pickup_start = raw_pickup_start % cycle_duration;
                
                // For multiple swings, we need continuous production.
                // The machine produces items at rate: amount_per_craft / ticks_per_craft
                // After picking up stack_size, it takes ticks_to_stack to replenish.
                // So each swing needs ticks_to_stack + swing_duration to complete.
                const ticks_per_swing_with_wait = Math.max(
                    animation.total.ticks,
                    ticks_to_stack
                );
                const extended_duration = Math.min(
                    ticks_per_swing_with_wait * total_transfer_count + 4,
                    cycle_duration // Cap at cycle duration to avoid exceeding bounds
                );
                
                return OpenRange.fromStartAndDuration(
                    pickup_start,
                    extended_duration
                )
            }
            
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks + 4
            )
        }

        if (mode === SimulationMode.NORMAL) {
            const total_swing_duration = Duration.ofTicks(
                (animation.total.ticks + 1) * total_transfer_count
            );
            return OpenRange.fromStartAndDuration(
                0,
                total_swing_duration.ticks - animation.rotation.ticks - animation.drop.ticks
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
        this.resettable_registry.register(clocked_control);

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

    /**
     * Find all machines that produce the target output item.
     */
    private findFinalMachines(): Set<MachineState> {
        const final_machines = this.entity_state_registry
            .getAllStates()
            .filter(EntityState.isMachine)
            .filter(s => s.machine.output.item_name === this.target_output_item_name);
        assert(
            final_machines.length > 0,
            `No machine found producing target output item ${this.target_output_item_name}`
        );
        return new Set(final_machines);
    }

    /**
     * Find all inserters that take output from terminal machines.
     * Each terminal machine must have exactly one dedicated output inserter.
     */
    private findFinalInserters(): Set<InserterState> {
        const final_inserters = new Set<InserterState>();
        for (const terminal_machine of this.terminal_machine_states) {
            const inserter = this.entity_state_registry
                .getAllStates()
                .filter(EntityState.isInserter)
                .find(s => s.inserter.source.entity_id.id === terminal_machine.entity_id.id);
            assert(
                inserter !== undefined,
                `No inserter found taking output from terminal machine ${terminal_machine.entity_id.id}`
            );
            final_inserters.add(inserter);
        }
        return final_inserters;
    }

    /**
     * Find the terminal machine that a given terminal inserter takes output from.
     */
    private findTerminalMachineForInserter(inserter_state: InserterState): MachineState {
        for (const terminal_machine of this.terminal_machine_states) {
            if (inserter_state.inserter.source.entity_id.id === terminal_machine.entity_id.id) {
                return terminal_machine;
            }
        }
        throw new Error(
            `Inserter ${inserter_state.entity_id.id} is not connected to any terminal machine`
        );
    }
}