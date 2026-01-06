import { Belt } from "../entities";
import { ConstantInventoryState } from "./constant-inventory-state";
import { InventoryState, WritableInventoryState } from "./inventory-state";

/**
 * Belt inventory state.
 * 
 * A wrapper for constant inventory state for convenience.
 */
export class BeltInventoryState extends ConstantInventoryState implements WritableInventoryState {

    /**
     * The number of items that can fit on a single belt lane when stopped at stack size 1.
     * 
     * If stack size is 4, then it would be 16 items.
     */
    public static readonly QUANTITY_PER_LANE = 4;

    public static fromBelt(belt: Belt): BeltInventoryState {
        const inventoryState = InventoryState.empty();
        belt.lanes.forEach((lane) => {
            inventoryState.addQuantity(lane.ingredient_name, lane.stack_size * BeltInventoryState.QUANTITY_PER_LANE);
        });
        return new BeltInventoryState(ConstantInventoryState.fromInventoryState(inventoryState));
    }

    private constructor(inventoryState: ConstantInventoryState) {
        super(inventoryState);
    }
}