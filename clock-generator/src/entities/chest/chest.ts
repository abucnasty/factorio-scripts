import { FactorioDataService, ItemName } from "../../data";
import { ChestConfig } from "../../config/schema";
import { Entity } from "../entity";
import { EntityId } from "../entity-id";

/**
 * Chest entity interface.
 * 
 * A chest is considered just a blob that can hold inventory.
 * 
 * The storage_size is the total number of item slots the chest can hold.
 * 
 * For example, if a chest has 12 slots and we fill it with iron ore which
 * has a stack size of 50, the chest can hold up to 600 iron ore.
 * 
 * The item_filter restricts the chest to holding only a single item type.
 * This simplifies capacity calculations since we only need to track one
 * stack size.
 */
export class Chest implements Entity {

    public static fromConfig = fromConfig;

    constructor(
        public readonly entity_id: EntityId,
        /**
         * The total number of inventory slots in this chest.
         */
        public readonly storage_size: number,
        /**
         * The single item type this chest is filtered to hold.
         * Chests only support one item type for simplicity.
         */
        public readonly item_filter: ItemName,
        /**
         * The stack size of the filtered item (cached for capacity calculations).
         */
        public readonly item_stack_size: number,
    ) { }

    /**
     * Get the maximum capacity of this chest in items.
     */
    public getCapacity(): number {
        return this.storage_size * this.item_stack_size;
    }

    public toString(): string {
        return `Chest(${this.entity_id.id}, item=${this.item_filter}, capacity=${this.getCapacity()})`;
    }
}

function fromConfig(config: ChestConfig): Chest {
    const item = FactorioDataService.findItemOrThrow(config.item_filter);
    return new Chest(
        EntityId.forChest(config.id),
        config.storage_size,
        config.item_filter,
        item.stack_size,
    );
}