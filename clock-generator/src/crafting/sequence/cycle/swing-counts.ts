import Fraction from "fractionability";
import { Entity, EntityId, Inserter, Machine, ReadableEntityRegistry } from "../../../entities";
import assert from "assert";
import { MachineIngredientRatios } from "./machine-ratios";
import * as math from "mathjs"

export interface InserterSwingCount {
    inserter: Inserter;
    item_name: string;
    swing_count: Fraction;
    stack_size: number;
}

export type SwingCountEntityMap = Map<EntityId, InserterSwingCount>;

export const SwingCountEntityMap = {
    create: computeInserterSwingCounts,
    lcm: computeLCM,
    print: printInserterSwingCounts,
}

/**
 * Computes the number of swings required per inserter based on the recursive ratios
 * of ingredients needed by the target machine and the inserter's stack size.
 * 
 * For each inserter feeding into a machine, this calculates how many swings are needed
 * to deliver the correct ratio of items per production cycle.
 * 
 * If multiple inserters feed the same item to the machine, the swing count is divided
 * equally among them.
 * 
 * For daisy-chained machines (where the source of an inserter is another machine),
 * this function recursively computes swing counts for all upstream machines.
 * 
 * @param machine - The target machine receiving items
 * @param entity_registry - Registry containing all entities
 * @param output_swing_count - The number of swings for the output inserter
 * @param output_stack_size - The stack size of the output inserter
 * @param existing_results - Accumulated results from recursive calls (used internally)
 * @returns Map of inserter entity IDs to their swing count information
 */
function computeInserterSwingCounts(
    machine: Machine,
    entity_registry: ReadableEntityRegistry,
    output_swing_count: Fraction,
    output_stack_size: number,
    existing_results: SwingCountEntityMap = new Map()
): SwingCountEntityMap {
    const result: SwingCountEntityMap = existing_results;

    const base_production_amount: Fraction = output_swing_count.multiply(output_stack_size);

    const output_inserter = entity_registry.getAll()
        .filter(Entity.isInserter)
        .find(inserter => inserter.source.entity_id.id === machine.entity_id.id);

    assert(output_inserter !== undefined, `No inserter found that takes output from machine ${machine.entity_id}`);

    result.set(output_inserter.entity_id, {
        inserter: output_inserter,
        item_name: machine.output.item_name,
        swing_count: output_swing_count,
        stack_size: output_inserter.metadata.stack_size
    })

    // Get the recursive ratios for this machine
    const ratios = MachineIngredientRatios.forMachine(machine, entity_registry);

    // Find all inserters that feed into this machine
    const inserters = entity_registry.getAll()
        .filter(Entity.isInserter)
        .filter(inserter => inserter.sink.entity_id.id === machine.entity_id.id);

    // Count how many inserters feed each item type
    const inserters_per_item: Map<string, Inserter[]> = new Map();
    for (const inserter of inserters) {
        for (const item_name of inserter.filtered_items) {
            const inserter_list = inserters_per_item.get(item_name) ?? [];
            inserter_list.push(inserter);
            inserters_per_item.set(item_name, inserter_list);
        }
    }

    // For each inserter, calculate the swing count based on the item ratios and stack size
    for (const inserter of inserters) {
        // Determine which items this inserter transfers
        for (const item_name of inserter.filtered_items) {
            const ratio = ratios[item_name];

            if (ratio) {
                // Calculate the amount of this item needed per production cycle
                const amount_needed = ratio.multiply(base_production_amount);

                // Divide by the number of inserters feeding this item type
                const num_inserters = inserters_per_item.get(item_name)?.length ?? 1;
                const amount_per_inserter = amount_needed.divide(num_inserters);

                // Calculate the number of swings needed to deliver this amount
                // swing_count = amount_per_inserter / stack_size
                const swing_count = amount_per_inserter.divide(inserter.metadata.stack_size);

                result.set(inserter.entity_id, {
                    inserter,
                    item_name,
                    swing_count,
                    stack_size: inserter.metadata.stack_size
                });

                // Check if the source is a machine - if so, recursively compute its swing counts
                const source_entity = entity_registry.getAll()
                    .find(e => e.entity_id.id === inserter.source.entity_id.id);

                if (source_entity && Entity.isMachine(source_entity)) {
                    // Recursively compute swing counts for the source machine
                    computeInserterSwingCounts(
                        source_entity,
                        entity_registry,
                        swing_count,
                        inserter.metadata.stack_size,
                        result
                    );
                }
            }
        }
    }

    return result;
}

function computeLCM(swing_counts: SwingCountEntityMap): number {
    const ratios = Array.from(swing_counts.values()).map(it => it.swing_count);

    const denominators = ratios.map(it => it.getDenominator)

    return denominators.reduce((lcm, denominator) => math.lcm(lcm, denominator), 1);
}

function printInserterSwingCounts(swings: SwingCountEntityMap) {
    console.log("----------------------");
    console.log("Inserter Swing Counts:");
    swings.forEach(it => {
        console.log(`- Inserter ${it.inserter.entity_id.id} for item ${it.item_name}: ${it.swing_count} swings (stack size: ${it.stack_size})`);
    });
    console.log("----------------------");
};