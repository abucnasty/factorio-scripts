import { InventoryState } from "./inventory-state";
import { ProgressState } from "./progress-state";
import { Machine } from "../entities";

export interface MachineState {
    readonly machine: Machine;
    readonly craftingProgress: ProgressState;
    readonly bonusProgress: ProgressState;
    readonly inventoryState: InventoryState;
}

function forMachine(machine: Machine): MachineState {
    const inventoryState = InventoryState.createFromMachineInputs(machine.inputs);
    return {
        machine: machine,
        craftingProgress: ProgressState.empty(),
        bonusProgress: ProgressState.empty(),
        inventoryState: inventoryState
    };
}

function clone(machineState: MachineState): MachineState {
    return {
        machine: machineState.machine,
        craftingProgress: ProgressState.clone(machineState.craftingProgress),
        bonusProgress: ProgressState.clone(machineState.bonusProgress),
        inventoryState: InventoryState.clone(machineState.inventoryState),
    }
}

export const MachineState = {
    forMachine: forMachine,
    clone: clone,
}