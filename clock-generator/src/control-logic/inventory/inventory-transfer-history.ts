import { InventoryTransfer } from "../../crafting/sequence/inventory-transfer";
import { EntityId } from "../../entities";

export class InventoryTransferHistory {
    private readonly transfers: Map<EntityId, InventoryTransfer[]> = new Map();

    constructor() {}

    public clear(): void {
        this.transfers.clear();
    }

    public recordTransfer(entity_id: EntityId, transfer: InventoryTransfer): void {
        const transfer_list = this.transfers.get(entity_id) ?? [];
        transfer_list.push(transfer);
        this.transfers.set(entity_id, transfer_list);
    }

    public getTransfers(entity_id: EntityId): InventoryTransfer[] {
        return this.transfers.get(entity_id) ?? [];
    }

    public getAllTransfers(): ReadonlyMap<EntityId, InventoryTransfer[]> {
        const copy = new Map();
        this.transfers.forEach((value, key) => {
            copy.set(key, [...value.map(it => ({ ...it }))]);
        });
        return copy;
    }
}