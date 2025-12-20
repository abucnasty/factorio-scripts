import assert from "assert";
import { Duration } from "../../data-types";
import { Inserter, InserterStackSize, Machine } from "../../entities";

export const SimulationMode = {
    LOW_INSERTION_LIMITS: "low_insertion_limits",
    PREVENT_DESYNCS: "prevent_desyncs",
    NORMAL: "normal",
} as const;

export type SimulationMode = typeof SimulationMode[keyof typeof SimulationMode];

export function simulationModeForInput(
    inserter: Inserter,
    sink_machine: Machine
): SimulationMode {
    const machine_inputs = Array.from(sink_machine.inputs.values());
    const filtered_items = inserter.filtered_items;
    const is_input_inserter = inserter.sink.entity_id.id === sink_machine.entity_id.id;
    assert(is_input_inserter, `Inserter ${inserter.entity_id} is not an input inserter for machine ${sink_machine.entity_id}`)

    const any_filtered_item_has_low_insertion_limit = machine_inputs
        .filter(it => filtered_items.has(it.item_name))
        .some(it => it.automated_insertion_limit.quantity < InserterStackSize.SIZE_16)

    if (any_filtered_item_has_low_insertion_limit) {
        return SimulationMode.LOW_INSERTION_LIMITS;
    }

    return SimulationMode.NORMAL;
}

export function simulationModeForOutput(
    inserter: Inserter,
    source_machine: Machine
): SimulationMode {

    const machine_inputs = Array.from(source_machine.inputs.values());
    const is_output_inserter = inserter.source.entity_id.id === source_machine.entity_id.id;

    assert(is_output_inserter, `Inserter ${inserter.entity_id} is not an output inserter for machine ${source_machine.entity_id}`)

    const any_input_has_low_insertion_limit = machine_inputs.some(it => it.automated_insertion_limit.quantity < InserterStackSize.SIZE_16)

    if (any_input_has_low_insertion_limit) {
        return SimulationMode.LOW_INSERTION_LIMITS;
    }

    const output_block = source_machine.output.outputBlock;

    // if the output block condition is less than the max stack size for the ingredient, need to prevent
    // desyncs and add a buffer of a pickup to use the inserter as the inventory holder
    if (output_block.quantity < output_block.max_stack_size) {
        return SimulationMode.PREVENT_DESYNCS;
    }
    return SimulationMode.NORMAL;
}

export function computeSimulationMode(
    machine: Machine,
    inserter: Inserter
): SimulationMode {

    const is_output_inserter = inserter.source.entity_id.id === machine.entity_id.id;
    const is_input_inserter = inserter.sink.entity_id.id === machine.entity_id.id;

    if (is_input_inserter) {
        return simulationModeForInput(inserter, machine);
    }

    if (is_output_inserter) {
        return simulationModeForOutput(inserter, machine);
    }

    throw new Error(`Inserter ${inserter.entity_id} is not connected to machine ${machine.entity_id}`);
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
