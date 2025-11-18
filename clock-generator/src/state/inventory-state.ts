export interface InventoryItem {
    item_name: string;
    quantity: number;
}

export class InventoryState {
    private inventory: Map<string, number>;

    constructor(initialInventory?: Record<string, number>) {
        this.inventory = new Map(Object.entries(initialInventory || {}));
    }

    public getQuantity(itemName: string): number {
        return this.inventory.get(itemName) ?? 0;
    }

    public add(itemName: string, amount: number): void {
        if (amount < 0) {
            throw new Error(`Cannot add negative amount: ${amount}`);
        }
        const current = this.getQuantity(itemName);
        this.inventory.set(itemName, current + amount);
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