import { OpenRange } from "../data-types";
import { EntityId, EntityRegistry, Inserter } from "../entities";
import { InventoryTransfer } from "../crafting/sequence/inventory-transfer";

export function printInventoryTransfers(
    inventory_transfers: Map<EntityId, InventoryTransfer[]>,
    relative_tick_mod: number = 0
): void {
    inventory_transfers.forEach((transfers, entityId) => {
        console.log(`Transfer Ranges for ${entityId}`);
        transfers
        .sort((a, b) => a.tick_range.start_inclusive - b.tick_range.start_inclusive)
        .forEach((transfer) => {
            const start_inclusive = transfer.tick_range.start_inclusive;
            const end_inclusive = transfer.tick_range.end_inclusive;
            if (relative_tick_mod > 0) {
                const start_mod = start_inclusive % relative_tick_mod;
                const end_mod = end_inclusive % relative_tick_mod;
                console.log(`- [${start_inclusive} - ${end_inclusive}](${start_mod} - ${end_mod}) (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
                return;
            }
            console.log(`- [${start_inclusive} - ${end_inclusive}] (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
        })
    })
}

export function printInserterActiveRanges(
    inserter_active_ranges: Map<EntityId, OpenRange[]>,
    entityRegistry: EntityRegistry,
    relative_tick_mod: number = 0
): void {
    inserter_active_ranges!.forEach((active_ranges, entity_id) => {
        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(entity_id);
        const items = Array.from(inserter.filtered_items).join(", ");
        console.log("------------------------------")
        console.log(`Inserter Active Ranges for ${entity_id} ${items}`);
        active_ranges.forEach((active_range) => {
            const start_inclusive = active_range.start_inclusive;
            const end_inclusive = active_range.end_inclusive;
            if (relative_tick_mod > 0) {
                const start_mod = start_inclusive % relative_tick_mod;
                const end_mod = end_inclusive % relative_tick_mod;
                console.log(`- ${active_range} (${start_mod} - ${end_mod}) (${active_range.duration().ticks} ticks)`);
                return;
            }
            console.log(`- [${start_inclusive} - ${end_inclusive}] (${active_range.duration().ticks} ticks)`);
        })
    })
}