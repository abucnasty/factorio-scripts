import { computeSimulationMode, SimulationMode } from "./simulation-mode";
import { InventoryTransfer } from "./inventory-transfer";
import { Duration, MapExtended, OpenRange } from "../../data-types";
import { Entity, EntityId, Inserter, Machine, ReadableEntityRegistry } from "../../entities";
import { Logger, defaultLogger } from "../../common/logger";

export class InventoryTransferHistory extends MapExtended<EntityId, InventoryTransfer[]> {

    public static mergeOverlappingRanges(history: InventoryTransferHistory, overlap_threshold: number = 1): InventoryTransferHistory {
        const merged = mergeOverlappingRanges(history.getAllTransfers(), overlap_threshold);
        return new InventoryTransferHistory(merged);
    }

    public static correctNegativeOffsets(history: InventoryTransferHistory): InventoryTransferHistory {
        const offset = correctNegativeOffsets(history.getAllTransfers());
        return new InventoryTransferHistory(offset);
    }

    public static removeDuplicateEntities(history: InventoryTransferHistory): InventoryTransferHistory {
        const deduplicated = deduplicateEntityTransfers(history.getAllTransfers());
        return new InventoryTransferHistory(deduplicated);
    }

    public static offsetHistory(
        history: InventoryTransferHistory,
        offset: number
    ): InventoryTransferHistory {
        const offset_transfers = offsetInventoryTransfers(history.getAllTransfers(), offset);
        return new InventoryTransferHistory(offset_transfers);
    }

    public static trimEndsToAvoidBackSwingWakeLists(
        history: InventoryTransferHistory,
        entity_registry: ReadableEntityRegistry
    ): InventoryTransferHistory {
        const trimmed: Map<EntityId, InventoryTransfer[]> = new Map();

        history.getAllTransfers().forEach((transfers, entityId) => {
            const entity = entity_registry.getEntityByIdOrThrow(entityId);
            if (!Entity.isInserter(entity)) {
                trimmed.set(entityId, transfers);
                return;
            }
            const source_machine = entity_registry.getEntityByIdOrThrow(entity.source.entity_id);
            if (!Entity.isMachine(source_machine)) {
                trimmed.set(entityId, transfers);
                return;
            }

            const last_swing_offset = computeLastSwingOffsetDuration(
                source_machine,
                entity
            );

            const trimmed_transfers: InventoryTransfer[] = transfers.map(transfer => {
                const original_range = transfer.tick_range;
                const trimmed_range = OpenRange.from(
                    original_range.start_inclusive,
                    original_range.end_inclusive + last_swing_offset.ticks
                );
                return {
                    item_name: transfer.item_name,
                    tick_range: trimmed_range,
                }
            }).filter(transfer => transfer.tick_range.duration().ticks > 0);

            trimmed.set(entityId, trimmed_transfers);
        })
        return new InventoryTransferHistory(trimmed);
    }

    public static print(history: InventoryTransferHistory, logger: Logger = defaultLogger, relative_tick_mod: number = 0): void {
        printInventoryTransfers(history, logger, relative_tick_mod);
    }


    constructor(
        transfers: Map<EntityId, InventoryTransfer[]> = new Map()
    ) {
        super(Array.from(transfers.entries()));
    }

    public recordTransfer(entity_id: EntityId, transfer: InventoryTransfer): void {
        const transfer_list = this.get(entity_id) ?? [];
        transfer_list.push(transfer);
        this.set(entity_id, transfer_list);
    }

    public getAllTransfers(): ReadonlyMap<EntityId, InventoryTransfer[]> {
        const copy = new Map();
        this.forEach((value, key) => {
            copy.set(key, [...value.map(it => ({ ...it }))]);
        });
        return copy;
    }
}

function mergeOverlappingRanges(original: ReadonlyMap<EntityId, InventoryTransfer[]>, overlap_threshold: number = 1): Map<EntityId, InventoryTransfer[]> {
    const result: Map<EntityId, InventoryTransfer[]> = new Map();

    original.forEach((ranges, entityId) => {

        const by_item: Map<string, InventoryTransfer[]> = new Map()

        ranges.forEach(it => {
            const transfers = by_item.get(it.item_name) ?? []
            by_item.set(it.item_name, transfers.concat(it))
        })

        by_item.forEach((ranges, itemName) => {
            const merged_ranges: InventoryTransfer[] = OpenRange.reduceRanges(ranges.map(it => it.tick_range), overlap_threshold).map(it => {
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

function offsetInventoryTransfers(
    original: ReadonlyMap<EntityId, InventoryTransfer[]>,
    offset: number
): Map<EntityId, InventoryTransfer[]> {
    const result: Map<EntityId, InventoryTransfer[]> = new Map();

    original.forEach((ranges, entityId) => {
        const offset_ranges: InventoryTransfer[] = ranges.map(it => {
            return {
                item_name: it.item_name,
                tick_range: OpenRange.from(
                    it.tick_range.start_inclusive + offset,
                    it.tick_range.end_inclusive + offset
                )
            }
        })
        result.set(entityId, offset_ranges)
    })
    return result;
}

function correctNegativeOffsets(original: ReadonlyMap<EntityId, InventoryTransfer[]>): Map<EntityId, InventoryTransfer[]> {
    const result: Map<EntityId, InventoryTransfer[]> = new Map();

    let minimum_tick = Infinity;
    Array.from(original.values()).flat().forEach(transfer => {
        minimum_tick = Math.min(minimum_tick, transfer.tick_range.start_inclusive);
    })

    const offset = minimum_tick - 1

    original.forEach((ranges, entityId) => {
        const corrected_ranges: InventoryTransfer[] = ranges.map(it => {
            return {
                item_name: it.item_name,
                tick_range: OpenRange.from(
                    it.tick_range.start_inclusive - offset,
                    it.tick_range.end_inclusive - offset
                )
            }
        })
        result.set(entityId, corrected_ranges)
    })
    return result;
}

function printInventoryTransfers(
    history: InventoryTransferHistory,
    logger: Logger = defaultLogger,
    relative_tick_mod: number = 0
): void {
    Array.from(history.getAllTransfers().values())
        .sort((a, b) => a[0]?.tick_range.start_inclusive - b[0]?.tick_range.start_inclusive)
        .forEach((transfers, entityId) => {
            logger.log(`Transfer Ranges for ${entityId}`);
            transfers
                .sort((a, b) => a.tick_range.start_inclusive - b.tick_range.start_inclusive)
                .forEach((transfer) => {
                    const start_inclusive = transfer.tick_range.start_inclusive;
                    const end_inclusive = transfer.tick_range.end_inclusive;
                    if (relative_tick_mod > 0) {
                        const start_mod = start_inclusive % relative_tick_mod;
                        const end_mod = end_inclusive % relative_tick_mod;
                        logger.log(`- [${start_inclusive} - ${end_inclusive}](${start_mod} - ${end_mod}) (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
                        return;
                    }
                    logger.log(`- [${start_inclusive} - ${end_inclusive}] (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
                })
        })
}

/**
 * if two entities have the exact same transfer ranges and items, we can reduce them to one entity
 */
function deduplicateEntityTransfers(transfers: ReadonlyMap<EntityId, InventoryTransfer[]>): Map<EntityId, InventoryTransfer[]> {
    const result: Map<EntityId, InventoryTransfer[]> = new Map();

    const seenTransferSignatures: Map<string, EntityId> = new Map();

    transfers.forEach((transferList, entityId) => {
        // create a signature for the transfer list
        const signature = transferList
            .map(transfer => `${transfer.item_name}:${transfer.tick_range.start_inclusive}-${transfer.tick_range.end_inclusive}`)
            .sort() // sort to ensure order doesn't matter
            .join("|");

        if (!seenTransferSignatures.has(signature)) {
            seenTransferSignatures.set(signature, entityId);
            result.set(entityId, transferList);
        } else {
            // duplicate found, skip adding this entity
        }
    });

    return result;
}


function computeLastSwingOffsetDuration(
    source_machine: Machine,
    inserter: Inserter
): Duration {
    const mode = computeSimulationMode(source_machine, inserter);
    if (mode === SimulationMode.NORMAL) {
        const animation = inserter.animation
        const offset = animation.rotation.ticks
        return Duration.ofTicks(-1 * offset);
    }

    if (mode === SimulationMode.LOW_INSERTION_LIMITS) {
        const inserter_stack_size = inserter.metadata.stack_size;
        const amount_per_craft_int = Math.ceil(source_machine.output.amount_per_craft.toDecimal());
        /**
         * okay... so...
         * this is going to look like magic because, it is.
         * Purely by observation, the following buffers are ideal for handling desyncs 
         * when dealing with low insertion limits.
         * 
         * | Recipe | Amount Per Craft | Ideal Buffer |
         * | ------ | ---------------- | ------------ |
         * | green  | 2                | 4            |
         * | blue   | 4                | 2            |
         * | yellow | 6                | 0            |
         * | purple | 6                | 0            |
         * 
         * These most likely only work with legendary stack inserters at stack size 16 but ¯\_(ツ)_/¯
         */
        if (amount_per_craft_int < inserter_stack_size) {
            const max_buffer = 6
            const buffer = Math.max(0, max_buffer - amount_per_craft_int)
            return Duration.ofTicks(buffer)
        }
    }
    return Duration.zero;
}
