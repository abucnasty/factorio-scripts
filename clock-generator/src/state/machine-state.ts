import { InventoryState } from "./inventory-state";
import { InventoryStateFactory } from "./inventory-state-factory";
import { ProgressState } from "./progress-state";
import { ItemName } from "../data/factorio-data-types";
import { Machine } from "../entities";

export class MachineState {

    public static forMachine(machine: Machine): MachineState {
        const inventoryState = InventoryStateFactory.createFromMachineInputs(machine.inputs);
        return new MachineState(machine, new ProgressState(), new ProgressState(), inventoryState);
    }

    public static clone(machineState: MachineState): MachineState {
        return new MachineState(
            machineState.machine,
            ProgressState.clone(machineState.craftingProgress),
            ProgressState.clone(machineState.bonusProgress),
            InventoryStateFactory.clone(machineState.inventoryState)
        );
    }

    private constructor(
        public readonly machine: Machine,
        public readonly craftingProgress: ProgressState = new ProgressState(),
        public readonly bonusProgress: ProgressState = new ProgressState(),
        public readonly inventoryState: InventoryState = InventoryStateFactory.createFromMachineInputs(machine.inputs)
    ) {}

    public isIdle(): boolean {
        return this.craftingProgress.progress.toDecimal() === 0;
    }

    public isUnderAutomatedInsertionLimit(itemName: ItemName): boolean {
        const input = this.machine.inputs.get(itemName);
        if (!input) {
            throw new Error(`Machine ${this.machine.id} does not have input for item ${itemName}`);
        }
        
        const currentQuantity = this.inventoryState.getQuantity(itemName);
        const automatedInsertionLimit = input.automated_insertion_limit.quantity;
        
        return currentQuantity < automatedInsertionLimit;
    }
}