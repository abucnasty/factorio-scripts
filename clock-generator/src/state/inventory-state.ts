import { MachineInput } from "../entities";

export interface InventoryItem {
    item_name: string;
    quantity: number;
}

export class InventoryState {

    public static createFromMachineInputs(machineInputs: Map<string, MachineInput>): InventoryState {
        const inventory = this.createEmpty();
        for (const itemName of machineInputs.keys()) {
            inventory.addQuantity(itemName, 0);
        }
        return inventory;
    }

    public static createEmptyForSingleItem(itemName: string): InventoryState {
        const inventory = this.createEmpty();
        inventory.addQuantity(itemName, 0);
        return inventory;
    }

    public static createEmpty(): InventoryState {
        return new InventoryState();
    }

    public static clone(inventoryState: InventoryState): InventoryState {
        return new InventoryState(inventoryState.export());
    }

    private inventory: Map<string, number>;

    constructor(initialInventory?: Record<string, number>) {
        this.inventory = new Map(Object.entries(initialInventory || {}));
    }

    public getQuantity(itemName: string): number {
        return this.inventory.get(itemName) ?? 0;
    }

    public addQuantity(itemName: string, amount: number): void {
        if (amount < 0) {
            throw new Error(`Cannot add negative amount: ${amount}`);
        }
        const current = this.getQuantity(itemName);
        this.inventory.set(itemName, current + amount);
    }

    public removeQuantity(itemName: string, amount: number): void {
        if (amount < 0) {
            throw new Error(`Cannot remove negative amount: ${amount}`);
        }
        const current = this.getQuantity(itemName);
        if (current < amount) {
            throw new Error(`Insufficient inventory: have ${current}, need ${amount} of ${itemName}`);
        }
        this.inventory.set(itemName, current - amount);
    }

    public setQuantity(itemName: string, amount: number): void {
        if (amount < 0) {
            throw new Error(`Cannot set negative amount: ${amount}`);
        }
        this.inventory.set(itemName, amount);
    }

    public remove(itemName: string, amount: number): void {
        if (amount < 0) {
            throw new Error(`Cannot remove negative amount: ${amount}`);
        }
        const current = this.getQuantity(itemName);
        if (current < amount) {
            throw new Error(`Insufficient inventory: have ${current}, need ${amount} of ${itemName}`);
        }
        this.inventory.set(itemName, current - amount);
    }

    public hasQuantity(itemName: string, amount: number): boolean {
        return this.getQuantity(itemName) >= amount;
    }

    public getItems(): InventoryItem[] {
        return Array.from(this.inventory.entries())
            .filter(([_, quantity]) => quantity > 0)
            .map(([itemName, quantity]) => ({ item_name: itemName, quantity }));
    }

    public getAllItems(): InventoryItem[] {
        return Array.from(this.inventory.entries())
            .map(([itemName, quantity]) => ({ item_name: itemName, quantity }));
    }

    public clear(): void {
        this.inventory.clear();
    }

    public resetItem(itemName: string): void {
        this.inventory.delete(itemName);
    }

    public getTotalQuantity(): number {
        return Array.from(this.inventory.values()).reduce((sum, qty) => sum + qty, 0);
    }

    public export(): Record<string, number> {
        return Object.fromEntries(this.inventory);
    }

    public isEmpty(): boolean {
        return this.getTotalQuantity() === 0;
    }
}