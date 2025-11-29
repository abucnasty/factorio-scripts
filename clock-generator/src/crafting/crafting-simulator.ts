import { fraction } from "fractionability";
import { MachineState } from "../state/machine-state";
import assert from "assert";
import { MachineControlLogic } from "../control-logic/machine-control-logic";

/**
 * 
 * deprecated – use machine control logic directly
 */
function simulateMachineCraftForTicks(
    machineState: MachineState,
    ticks: number,
): MachineState {

    const controlLogic = new MachineControlLogic(MachineState.clone(machineState));
    controlLogic.executeForTick();

    return MachineState.clone(controlLogic.state);
}

function machineHasEnoughInputsForCraft(machineState: MachineState): boolean {
    const machine = machineState.machine;

    const recipe = machine.metadata.recipe;

    for (const ingredient of recipe.inputsPerCraft.values()) {
        const requiredInputToCraft = ingredient.amount;
        if (machineState.inventoryState.getQuantity(ingredient.name) < requiredInputToCraft) {
            return false;
        }
    }

    return true;
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


export const CraftingSimulator = {
    simulateMachineCraftForTicks: simulateMachineCraftForTicks,
    machineHasEnoughInputsForCraft: machineHasEnoughInputsForCraft,
    machineInputIsBlocked: machineInputIsBlocked,
    machineIsOutputBlocked: machineIsOutputBlocked
}