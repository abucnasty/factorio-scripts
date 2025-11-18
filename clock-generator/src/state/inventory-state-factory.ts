import { MachineInput } from "../crafting/machine";
import { InventoryState } from "./inventory-state";

export class InventoryStateFactory {

    public static createFromMachineInputs(machineInputs: Record<string, MachineInput>): InventoryState {
        const inventory = this.createEmpty();
        for (const [itemName, _] of Object.entries(machineInputs)) {
            inventory.add(itemName, 0);
        }
        return inventory;
    }

    public static createEmpty(): InventoryState {
        return new InventoryState();
    }
}