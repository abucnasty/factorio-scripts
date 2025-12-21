import Fraction from "fractionability";
import { Entity, EntityId, Inserter, InserterStackSize, Machine, MiningDrill, ReadableEntityRegistry } from "../../../entities";
import assert from "../../../common/assert";
import { MachineIngredientRatios } from "./machine-ratios";
import * as math from "mathjs"
import { MapExtended } from "../../../data-types";
import { Logger, defaultLogger } from "../../../common/logger";

export interface ItemTransfer {
    item_name: string;
    transfer_count: Fraction;
}

export interface EntityTransferCount {
    entity: Inserter | MiningDrill;
    item_transfers: ItemTransfer[];
    total_transfer_count: Fraction;
    stack_size: number;
}

export class EntityTransferCountMap extends MapExtended<EntityId, EntityTransferCount> {

    public static create = computeInserterSwingCounts
    public static lcm = computeLCM
    public static print = printInserterSwingCounts
    public static divide = divideTransfers

    public static fromEntries(entries: [EntityId, EntityTransferCount][]): EntityTransferCountMap {
        return new EntityTransferCountMap(entries);
    }

    constructor(entries?: readonly (readonly [EntityId, EntityTransferCount])[] | null) {
        super(entries);
    }
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
    existing_results: EntityTransferCountMap = new EntityTransferCountMap()
): EntityTransferCountMap {
    const result: EntityTransferCountMap = existing_results;

    const base_production_amount: Fraction = output_swing_count.multiply(output_stack_size);

    const output_inserter = entity_registry.getAll()
        .filter(Entity.isInserter)
        .find(inserter => inserter.source.entity_id.id === machine.entity_id.id);

    assert(output_inserter !== undefined, `No inserter found that takes output from machine ${machine.entity_id}`);

    result.set(output_inserter.entity_id, {
        entity: output_inserter,
        item_transfers: [{
            item_name: machine.output.item_name,
            transfer_count: output_swing_count
        }],
        total_transfer_count: output_swing_count,
        stack_size: output_inserter.metadata.stack_size
    })

    // Get the recursive ratios for this machine
    const ratios = MachineIngredientRatios.forMachine(machine, entity_registry);

    // Find all inserters that feed into this machine
    const loader_entities = entity_registry.getAll()
        .filter(e => Entity.isInserter(e) || Entity.isDrill(e))
        .filter(e => {
            if (Entity.isInserter(e)) {
                return e.sink.entity_id.id === machine.entity_id.id;
            }
            if (Entity.isDrill(e)) {
                return e.sink_id.id === machine.entity_id.id;
            }
            return false;
        });

    // Count how many inserters feed each item type
    const inserters_per_item: Map<string, Inserter[]> = new Map();
    for (const inserter of loader_entities.filter(Entity.isInserter)) {
        for (const item_name of inserter.filtered_items) {
            const inserter_list = inserters_per_item.get(item_name) ?? [];
            inserter_list.push(inserter);
            inserters_per_item.set(item_name, inserter_list);
        }
    }

    const drill_per_item: Map<string, MiningDrill[]> = new Map();
    for (const drill of loader_entities.filter(Entity.isDrill)) {
        const item_name = drill.item.name;
        const drill_list = drill_per_item.get(item_name) ?? [];
        drill_list.push(drill);
        drill_per_item.set(item_name, drill_list);
    }

    // For each inserter, calculate the swing count based on the item ratios and stack size
    for (const inserter of loader_entities.filter(Entity.isInserter)) {
        const item_transfers: ItemTransfer[] = [];
        let total_transfer_count = new Fraction(0);

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

                item_transfers.push({
                    item_name,
                    transfer_count: swing_count
                });

                total_transfer_count = total_transfer_count.add(swing_count);
            }
        }

        // Only add to result if this inserter has item transfers
        if (item_transfers.length > 0) {
            result.set(inserter.entity_id, {
                entity: inserter,
                item_transfers,
                total_transfer_count,
                stack_size: inserter.metadata.stack_size
            });

            // Check if the source is a machine - if so, recursively compute its swing counts
            const source_entity = entity_registry.getAll()
                .find(e => e.entity_id.id === inserter.source.entity_id.id);

            if (source_entity && Entity.isMachine(source_entity)) {
                // Recursively compute swing counts for the source machine
                // Use total transfer count for upstream calculation
                computeInserterSwingCounts(
                    source_entity,
                    entity_registry,
                    total_transfer_count,
                    inserter.metadata.stack_size,
                    result
                );
            }
        }
    }

    // For each drill, calculate the swing count based on the item ratios and stack size
    for (const drill of loader_entities.filter(Entity.isDrill)) {
        const item_name = drill.item.name;
        const ratio = ratios[item_name];

        if (ratio) {
            // Calculate the amount of this item needed per production cycle
            const amount_needed = ratio.multiply(base_production_amount);

            // Divide by the number of drills mining this item type
            const num_drills = drill_per_item.get(item_name)?.length ?? 1;
            const amount_per_drill = amount_needed.divide(num_drills);
            // Calculate the number of swings needed to deliver this amount
            // swing_count = amount_per_drill / stack_size
            const drill_stack_size = InserterStackSize.SIZE_16
            const swing_count = amount_per_drill.divide(drill_stack_size);

            result.set(drill.entity_id, {
                entity: drill,
                item_transfers: [{
                    item_name,
                    transfer_count: swing_count
                }],
                total_transfer_count: swing_count,
                stack_size: drill_stack_size
            });
        }
    }

    return result;
}

function divideTransfers(
    original: EntityTransferCountMap,
    crafting_cycles: Fraction
): EntityTransferCountMap {
    assert(crafting_cycles.getDenominator === 1, "Crafting cycles must be an integer");
    return EntityTransferCountMap.fromEntries(
        original.map((value) => {
            return {
                entity: value.entity,
                item_transfers: value.item_transfers.map(it => ({
                    item_name: it.item_name,
                    transfer_count: it.transfer_count.divide(crafting_cycles)
                })),
                total_transfer_count: value.total_transfer_count.divide(crafting_cycles),
                stack_size: value.stack_size
            }
        })
    );
}

function computeLCM(swing_counts: EntityTransferCountMap): number {
    const ratios = swing_counts.mapValues(it => it.item_transfers).flat().map(it => it.transfer_count)

    const denominators = ratios.map(it => it.getDenominator)

    return denominators.reduce((lcm, denominator) => math.lcm(lcm, denominator), 1);
}

function printInserterSwingCounts(transfers: EntityTransferCountMap, logger: Logger = defaultLogger) {
    logger.log("----------------------");
    logger.log("Transfer Counts:");
    transfers.forEach(it => {
        if (Entity.isInserter(it.entity)) {
            if (it.item_transfers.length === 1) {
                logger.log(`- Inserter ${it.entity.entity_id.id} for item ${it.item_transfers[0].item_name}: ${it.total_transfer_count} transfers (stack size: ${it.stack_size})`);
            } else {
                const items = it.item_transfers.map(t => `${t.item_name} (${t.transfer_count})`).join(", ");
                logger.log(`- Inserter ${it.entity.entity_id.id} for items [${items}]: ${it.total_transfer_count} total transfers (stack size: ${it.stack_size})`);
            }
        }

        if (Entity.isDrill(it.entity)) {
            logger.log(`- Drill ${it.entity.entity_id.id} for item ${it.item_transfers[0].item_name}: ${it.total_transfer_count} transfers`);
        }
    });
    logger.log("----------------------");
};