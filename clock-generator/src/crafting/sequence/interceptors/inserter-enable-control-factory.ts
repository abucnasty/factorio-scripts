import assert from "assert";
import { EntityId, Inserter, InserterStackSize, Machine, ReadableEntityRegistry } from "../../../entities";
import { TargetProductionRate } from "../../target-production-rate";
import { EntityTransferCountMap } from "../cycle/swing-counts";
import { AlwaysEnabledControl, EnableControl } from "../../../control-logic/enable-control";
import { assertIsInserterState, BeltState, EntityState, InserterState, MachineState, ReadableEntityStateRegistry } from "../../../state";
import { ItemName } from "../../../data/factorio-data-types";
import { computeSimulationMode, SimulationMode } from "../simulation-mode";

export class InserterEnableControlFactory {

    private readonly target_output_item_name: string;
    private readonly terminal_machine: MachineState;
    private readonly terminal_inserter: InserterState;

    constructor(
        private readonly entity_registry: ReadableEntityRegistry,
        private readonly entity_state_registry: ReadableEntityStateRegistry,
        private readonly target_production_rate: TargetProductionRate,
        // TODO: this should be the source of truth that limits the number of sequential swings per cycle
        private readonly entity_transfer_map: EntityTransferCountMap
    ) {
        this.target_output_item_name = this.target_production_rate.machine_production_rate.item;
        this.terminal_machine = this.findFinalMachineOrThrow();
        this.terminal_inserter = this.findFinalInserterOrThrow();
    }

    public createForEntityId(entity_id: EntityId): EnableControl {
        const inserter_state = this.entity_state_registry.getStateByEntityIdOrThrow(entity_id);
        assertIsInserterState(inserter_state);

        const source_state = this.entity_state_registry.getSourceStateOrThrow(entity_id);
        const sink_state = this.entity_state_registry.getSinkStateOrThrow(entity_id);

        if (inserter_state === this.terminal_inserter) {
            // create output inserter control here
            throw new Error("Not implemented yet");
        }

        if (EntityState.isMachine(source_state) && EntityState.isMachine(sink_state)) {
            return this.fromMachinetoMachine(inserter_state.inserter, source_state, sink_state);
        }

        if (EntityState.isBelt(source_state) && EntityState.isMachine(sink_state)) {
            return this.fromBeltToMachine(inserter_state.inserter, source_state, sink_state);
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
                source_item_name,
                inserter.metadata.stack_size,
            )
        }

        return EnableControl.all(
            [
                this.sourceIsGreaterThanStackSize(
                    source_state,
                    source_item_name,
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


    private sourceIsGreaterThanStackSize(
        source: MachineState,
        source_item_name: ItemName,
        stack_size: InserterStackSize
    ): EnableControl {
        return EnableControl.lambda(() => {
            const source_quantity = source.inventoryState.getItemOrThrow(source_item_name).quantity;
            return source_quantity >= stack_size
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
            .find(s => s.inserter.source.entity_id.id === this.terminal_machine.entity_id.id);
        assert(final_inserter !== undefined,
            `No inserter found taking output from machine ${this.terminal_machine.entity_id}`
        )
        return final_inserter
    }
}