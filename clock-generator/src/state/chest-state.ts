import { ItemName } from "../data";
import { Chest } from "../entities";
import { EntityState } from "./entity-state";
import { WritableInventoryState } from "./inventory-state";

export interface ChestState extends EntityState {
    readonly chest: Chest;
    readonly inventoryState: WritableInventoryState;
    
    getCapacity(): number;
    getCurrentQuantity(itemName?: ItemName): number;
    getAvailableSpace(): number;
    isFull(): boolean;
    isEmpty(): boolean;
    getItemFilters(): ItemName[];
}