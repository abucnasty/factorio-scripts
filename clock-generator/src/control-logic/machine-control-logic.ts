import { Machine } from "../crafting/machine";
import { MachineState } from "../state/machine-state";
import { ControlLogic } from "./control-logic";

export class MachineControlLogic implements ControlLogic {

    static forMachine(machine: Machine): MachineControlLogic {
        const machineState = MachineState.forMachine(machine);
        return new MachineControlLogic(machineState);
    }

    constructor(
        public readonly machineState: MachineState
    ) { }

    executeForTicks(ticks: number): void {
        for (let tick = 0; tick < ticks; tick++) {
            this.execute();
        }
    }

    execute(): void {
        // each time this is invoked, if the machine has enough inventory to craft it should progress 
        // the bonusProgress and craftingProgress accordingly
        const machine = this.machineState.machine;
        const inventory = this.machineState.inventoryState;

        // check if we have enough inventory to craft
        let canCraft = true;
        for (const [itemName, input] of Object.entries(machine.inputs)) {
            if (!inventory.hasQuantity(itemName, input.ingredient.amount)) {
                canCraft = false;
                break;
            }
        }

        if (!canCraft) {
            return;
        }

        // progress crafting
        this.machineState.craftingProgress.progressBy(machine.crafting_rate.crafts_per_tick);
        this.machineState.bonusProgress.progressBy(machine.bonus_productivity_rate.progress_per_tick);

        if (this.machineState.craftingProgress.completed_this_tick) {
            // consume inputs
            for (const [itemName, input] of Object.entries(machine.inputs)) {
                inventory.remove(itemName, input.ingredient.amount);
            }

            // produce output
            inventory.addQuantity(machine.output.ingredient.name, machine.output.ingredient.amount);
        }

        if (this.machineState.bonusProgress.completed_this_tick) {
            // produce output
            inventory.addQuantity(machine.output.ingredient.name, machine.output.ingredient.amount);
        }
    }

}