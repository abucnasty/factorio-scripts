import { Duration } from "../../data-types";
import { Inserter, InserterStackSize, Machine } from "../../entities";

export const SimulationMode = {
    LOW_INSERTION_LIMITS: "low_insertion_limits",
    PREVENT_DESYNCS: "prevent_desyncs",
    NORMAL: "normal",
} as const;

export type SimulationMode = typeof SimulationMode[keyof typeof SimulationMode];


export function computeSimulationMode(
    source_machine: Machine,
    inserter: Inserter
): SimulationMode {
    const machine_inputs = Array.from(source_machine.inputs.values());
    const filtered_items = inserter.filtered_items;

    const is_output_inserter = inserter.source.entity_id.id === source_machine.entity_id.id;
    const is_input_inserter = inserter.sink.entity_id.id === source_machine.entity_id.id;

    if (!is_output_inserter && !is_input_inserter) {
        throw new Error(`Inserter ${inserter.entity_id} is not connected to machine ${source_machine.entity_id}`);
    }

    if (is_input_inserter) {
        const any_filtered_item_has_low_insertion_limit = machine_inputs
            .filter(it => filtered_items.has(it.item_name))
            .some(it => it.automated_insertion_limit.quantity < InserterStackSize.SIZE_16)

        if (any_filtered_item_has_low_insertion_limit) {
            return SimulationMode.LOW_INSERTION_LIMITS;
        }
    }

    if (is_output_inserter) {

        const any_input_has_low_insertion_limit = machine_inputs.some(it => it.automated_insertion_limit.quantity < InserterStackSize.SIZE_16)

        if(any_input_has_low_insertion_limit) {
            return SimulationMode.LOW_INSERTION_LIMITS;
        }

        const output_block = source_machine.output.outputBlock;

        // if the output block condition is less than the max stack size for the ingredient, need to prevent
        // desyncs and add a buffer of a pickup to use the inserter as the inventory holder
        if (output_block.quantity < output_block.max_stack_size) {
            return SimulationMode.PREVENT_DESYNCS;
        }
    }

    return SimulationMode.NORMAL;
}

export function computeLastSwingOffsetDuration(
    source_machine: Machine,
    inserter: Inserter
): Duration {
    const mode = computeSimulationMode(source_machine, inserter);
    if (mode === SimulationMode.NORMAL) {
        const animation = inserter.animation
        return Duration.ofTicks(
            animation.rotation.ticks + animation.drop.ticks
        );
    }
    return Duration.zero;
}
