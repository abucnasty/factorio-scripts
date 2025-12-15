import Fraction, { fraction } from "fractionability";
import { Entity, Machine, ReadableEntityRegistry } from "../../../entities";

export type MachineIngredientRatios  = Partial<Record<string, Fraction>>

export const MachineIngredientRatios = {
    forMachine: calculateForMachine
}

/**
 * for a given machine, take the ratio of inputs to production outputs including productivity
 * 
 * for example, if the machine produces 6 items with productivity and takes 3 of input A and 2 of input B
 * the ratio is:
 * 
 * A: 3/6 = 1/2
 * B: 2/6 = 1/3
 * 
 * then, for each input, if the input is produced by another machine, recursively get the ratios for that machine
 * and multiply them by the current machine's input ratio
 * 
 * finally, accumulate all ratios into a single map of item name to ratio
 */
function calculateForMachine(
    machine: Machine,
    entity_registry: ReadableEntityRegistry,
    existing: MachineIngredientRatios = {}
): MachineIngredientRatios {
    const result = existing;

    // Get the total output per craft including productivity
    const output_per_craft = machine.output.amount_per_craft;

    // Process each input ingredient
    for (const input of machine.inputs.values()) {
        // Get the amount of input required per craft
        const input_amount = fraction(input.ingredient.amount);

        // Calculate the ratio of this input to the output
        const ratio = input_amount.divide(output_per_craft);

        // Add or accumulate this ratio in the result
        const existing_ratio = result[input.item_name] ?? fraction(0);
        result[input.item_name] = existing_ratio.add(ratio);

        // Check if this input is produced by another machine
        const producer_machines = entity_registry.getAll()
            .filter(Entity.isMachine)
            .filter(m => m.output.item_name === input.item_name);

        const number_of_machines = producer_machines.length;

        const producer_machine = producer_machines[0]

        if (producer_machine) {
            // Divide the ratio by the number of producer machines to distribute the load
            const ratio_per_machine = ratio.divide(number_of_machines);
            // Recursively get the ratios for the producer machine
            const producer_ratios = calculateForMachine(producer_machine, entity_registry, {});

            // Multiply each producer ratio by the current input ratio and accumulate
            for (const [item_name, producer_ratio] of Object.entries(producer_ratios)) {
                const combined_ratio = producer_ratio!.multiply(ratio_per_machine);
                const existing_combined = result[item_name] ?? fraction(0);
                result[item_name] = existing_combined.add(combined_ratio);
            }
        }
    }

    return result;
}