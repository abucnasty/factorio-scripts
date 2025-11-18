import Fraction, { fraction}  from "fractionability";
import { Machine } from "../crafting/machine";
import { InventoryState } from "./inventory-state";
import { InventoryStateFactory } from "./inventory-state-factory";
import { ProgressState } from "./progress-state";

export class MachineState {
    constructor(
        public readonly machine: Machine,
        public readonly craftingProgress: ProgressState = new ProgressState(),
        public readonly bonusProgress: ProgressState = new ProgressState(),
        public readonly inventoryState: InventoryState = InventoryStateFactory.createFromMachineInputs(machine.inputs)
    ) {}

    public isIdle(): boolean {
        return this.craftingProgress.progress.toDecimal() === 0;
    }
}