import { OpenRange } from "../../data-types";

export interface InventoryTransfer {
    item_name: string;
    tick_range: OpenRange;
    amount: number;
}