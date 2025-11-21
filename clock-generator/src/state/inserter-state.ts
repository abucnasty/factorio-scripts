import { Inserter } from "../entities";
import { ItemName } from "../data/factorio-data-types";
import { InventoryItem, InventoryState } from "./inventory-state";
import { InventoryStateFactory } from "./inventory-state-factory";

export const INSERTER_STATUS = {
    IDLE: "IDLE",
    PICKING_UP: "PICKING_UP",
    TRANSFERRING: "TRANSFERRING",
    DROPPING_OFF: "DROPPING_OFF",
} as const;

export type InserterStatus = typeof INSERTER_STATUS[keyof typeof INSERTER_STATUS];

export class InserterState {

    public static forInserter(inserter: Inserter): InserterState {
        return new InserterState(
            inserter,
            InventoryStateFactory.createEmptyForSingleItem(inserter.ingredient_name)
        );
    }

    private animationTick: number = 0;

    private constructor(
        public readonly inserter: Inserter,
        public readonly inventory: InventoryState,
        public status: InserterStatus = INSERTER_STATUS.IDLE,
    ) { }


    public setStatus(status: InserterStatus): void {
        this.status = status;
    }

    public advanceTicks(ticks: number): void {
        this.animationTick = (this.animationTick + ticks) % this.inserter.swingDuration();
    }

    public addItemsToHand(item: ItemName, quantity: number): void {
        const currentHandContents = this.getHandContents();

        if (currentHandContents && currentHandContents.item_name !== item) {
            throw new Error(`Inserter ${this.inserter.id} already has items in hand`);
        }


        const handQuantity = currentHandContents ? currentHandContents.quantity : 0;

        if(handQuantity + quantity > this.inserter.stack_size) {
            throw new Error(`Inserter ${this.inserter.id} cannot hold more than ${this.inserter.stack_size} items in hand`);
        }

        this.inventory.setQuantity(item, handQuantity + quantity);
    }

    public dropItemsFromHand(item: ItemName): number {
        const quantityInHand = this.inventory.getQuantity(item);
        this.inventory.setQuantity(item, 0);
        return quantityInHand;
    }

    public hasItemsInHand(): boolean {
        return this.inventory.getTotalQuantity() > 0;
    }

    public getHandContents(): InventoryItem | null {
        if (!this.hasItemsInHand()) {
            return null;
        }
        const items = this.inventory.getAllItems();
        return items[0] || null;
    }

    public getHandContentsOrThrow(): InventoryItem {
        const contents = this.getHandContents();
        if (!contents) {
            throw new Error(`Inserter ${this.inserter.id} has no items in hand`);
        }
        return contents;
    }
}