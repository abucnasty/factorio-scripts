import { ItemName } from "../data";
import { Chest, EntityId } from "../entities";
import { EntityState } from "./entity-state";
import { InventoryState, WritableInventoryState } from "./inventory-state";

/**
 * State class for chest entities.
 * 
 * A chest is a passive inventory container that holds a single item type.
 * It has no status/mode - it just tracks inventory and capacity.
 */
export class ChestState implements EntityState {

    public static forChest = forChest;
    public static clone = clone;

    constructor(
        public readonly entity_id: EntityId,
        public readonly chest: Chest,
        public readonly inventoryState: WritableInventoryState,
    ) { }

    /**
     * Get the maximum capacity of this chest in items.
     * Calculated as storage_size (slots) × item_stack_size.
     */
    public getCapacity(): number {
        return this.chest.storage_size * this.chest.item_stack_size;
    }

    /**
     * Get the current quantity of items in the chest.
     */
    public getCurrentQuantity(): number {
        return this.inventoryState.getQuantity(this.chest.item_filter);
    }

    /**
     * Get the available space remaining in the chest.
     */
    public getAvailableSpace(): number {
        return this.getCapacity() - this.getCurrentQuantity();
    }

    /**
     * Check if the chest is full (no available space).
     */
    public isFull(): boolean {
        return this.getAvailableSpace() <= 0;
    }

    /**
     * Check if the chest is empty.
     */
    public isEmpty(): boolean {
        return this.getCurrentQuantity() <= 0;
    }

    /**
     * Get the item filter for this chest.
     */
    public getItemFilter(): ItemName {
        return this.chest.item_filter;
    }

    public toString(): string {
        return `ChestState(${this.entity_id},item=${this.chest.item_filter},qty=${this.getCurrentQuantity()}/${this.getCapacity()})`;
    }
}

function forChest(chest: Chest): ChestState {
    const inventoryState = InventoryState.createEmptyForSingleItem(chest.item_filter);
    return new ChestState(
        chest.entity_id,
        chest,
        inventoryState,
    );
}

function clone(state: ChestState): ChestState {
    return new ChestState(
        state.entity_id,
        state.chest,
        state.inventoryState.clone(),
    );
}
