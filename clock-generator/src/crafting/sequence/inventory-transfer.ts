import { OpenRange } from "../../data-types";
import { EntityId } from "../../entities";

export interface InventoryTransfer {
    item_name: string;
    tick_range: OpenRange;
}


/**
 * if two entities have the exact same transfer ranges and items, we can reduce them to one entity
 */
function deduplicateEntityTransfers(transfers: Map<EntityId, InventoryTransfer[]>): Map<EntityId, InventoryTransfer[]>{
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

export const InventoryTransfer = {
    deduplicateEntityTransfers: deduplicateEntityTransfers
}