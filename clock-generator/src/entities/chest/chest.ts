import { Entity } from "../entity";

/**
 * Chest entity interface.
 * 
 * A chest is considered just a blob that can hold inventory.
 * 
 * The storage_size is the total number of item slots the chest can hold.
 * 
 * For example, if a chest has 12 slots and we fill it with iron ore which
 * has a stack size of 50, the chest can hold up to 600 iron ore.
 */
export interface Chest extends Entity {
    storage_size: number;
}