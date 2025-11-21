import { MachineInput } from "../entities";
import { InventoryState } from "./inventory-state";

export class InventoryStateFactory {

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

    public static clone(inventory: InventoryState): InventoryState {
        const newInventory = this.createEmpty();
        for (const item of inventory.getAllItems()) {
            newInventory.addQuantity(item.item_name, item.quantity);
        }
        return newInventory;
    }
}