import { ItemName } from "../data";
import { Belt } from "../entities";
import { InventoryItem, InventoryState, WritableInventoryState } from "./inventory-state";


export class BeltInventoryState implements WritableInventoryState {

    /**
     * The number of items that can fit on a single belt lane when stopped at stack size 1.
     * 
     * If stack size is 4, then it would be 16 items.
     */
    public static readonly QUANTITY_PER_LANE = 4;

    public static fromBelt(
        belt: Belt
    ): BeltInventoryState {
        const inventoryState = InventoryState.empty();
        belt.lanes.forEach((lane) => {
            inventoryState.addQuantity(lane.ingredient_name, lane.stack_size * BeltInventoryState.QUANTITY_PER_LANE);
        });
        return new BeltInventoryState(belt, inventoryState);
    }

    private constructor(
        private readonly belt: Belt,
        private readonly inventoryState: WritableInventoryState,
    ) {
        belt.lanes.forEach((lane) => {
            this.inventoryState.addQuantity(lane.ingredient_name, lane.stack_size * BeltInventoryState.QUANTITY_PER_LANE);
        });
    }

    public getItem(itemName: string): InventoryItem | null {
        return this.inventoryState.getItem(itemName);
    }

    public getItemOrThrow(itemName: string): InventoryItem {
        return this.inventoryState.getItemOrThrow(itemName);
    }

    public hasQuantity(itemName: string, amount: number): boolean {
        return this.inventoryState.hasQuantity(itemName, amount);
    }

    public getItems(): InventoryItem[] {
        return this.inventoryState.getItems();
    }
    public getAllItems(): InventoryItem[] {
        return this.inventoryState.getAllItems();
    }
    public getTotalQuantity(): number {
        return this.inventoryState.getTotalQuantity();
    }
    public isEmpty(): boolean {
        return this.inventoryState.isEmpty();
    }

    public getQuantity(itemName: string): number {
        return this.inventoryState.getQuantity(itemName);
    }

    public addQuantity(itemName: string, quantity: number): void {
        this.inventoryState.addQuantity(itemName, quantity);
    }

    public removeQuantity(itemName: string, quantity: number): void {
        // NOOP: belts cannot have their contents removed directly
    }

    public setQuantity(itemName: string, amount: number): void {
        // NOOP: belts cannot have their contents removed directly
    }

    public clear(): void {
        // NOOP: belts cannot have their contents removed directly
    }

    public resetItem(itemName: string): void {
        // NOOP: belts cannot have their contents removed directly
    }

    public export(): Record<ItemName, number> {
        return this.inventoryState.export();
    }

    public clone(): WritableInventoryState {
        return BeltInventoryState.fromBelt(this.belt);
    }

}