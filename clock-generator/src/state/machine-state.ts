import { InventoryState, WritableInventoryState } from "./inventory-state";
import { ProgressState } from "./progress-state";
import { Machine } from "../entities";
import { EntityState } from "./entity-state";
import assert from "assert";

export const MachineStatus = {
    INGREDIENT_SHORTAGE: 'INGREDIENT_SHORTAGE',
    WORKING: 'WORKING',
    OUTPUT_FULL: 'OUTPUT_FULL',
} as const;

export type MachineStatus = typeof MachineStatus[keyof typeof MachineStatus];

export interface MachineState extends EntityState {
    readonly machine: Machine;
    readonly craftingProgress: ProgressState;
    readonly bonusProgress: ProgressState;
    readonly inventoryState: WritableInventoryState;
    status: MachineStatus
    craftCount: number;
    totalCrafted: number;
}

function forMachine(machine: Machine): MachineState {
    const inventoryState = InventoryState.createFromMachineInputs(machine.inputs);
    return {
        entity_id: machine.entity_id,
        machine: machine,
        craftingProgress: ProgressState.empty(),
        bonusProgress: ProgressState.empty(),
        inventoryState: inventoryState,
        craftCount: 0,
        status: MachineStatus.INGREDIENT_SHORTAGE,
        totalCrafted: 0,
    };
}

function clone(machineState: MachineState): MachineState {
    return {
        entity_id: machineState.entity_id,
        machine: machineState.machine,
        craftingProgress: ProgressState.clone(machineState.craftingProgress),
        bonusProgress: ProgressState.clone(machineState.bonusProgress),
        inventoryState: machineState.inventoryState.clone(),
        craftCount: machineState.craftCount,
        totalCrafted: machineState.totalCrafted,
        status: machineState.status,
    }
}

function machineAcceptsItem(machineState: MachineState, itemName: string): boolean {
    const machine = machineState.machine;

    return machine.inputs.has(itemName);
}

function machineInputIsBlocked(machineState: MachineState, ingredientName: string): boolean {

    if (!machineAcceptsItem(machineState, ingredientName)) {
        return true;
    }

    if (machineIsOutputBlocked(machineState)) {
        return true;
    }

    const machine = machineState.machine;
    const input = machine.inputs.get(ingredientName);
    assert(input != undefined, `Machine does not have input for ingredient ${ingredientName}`);
    const currentQuantity = machineState.inventoryState.getQuantity(input.ingredient.name);

    return currentQuantity >= input.automated_insertion_limit.quantity;
}

function machineIsOutputBlocked(machineState: MachineState): boolean {
    const machine = machineState.machine;

    const outputBlock = machine.output.outputBlock;
    const currentQuantity = machineState.inventoryState.getQuantity(outputBlock.item_name);

    return currentQuantity >= outputBlock.quantity
}

export const MachineState = {
    forMachine: forMachine,
    clone: clone,
    machineInputIsBlocked: machineInputIsBlocked,
    machineIsOutputBlocked: machineIsOutputBlocked,
    machineAcceptsItem: machineAcceptsItem,
}