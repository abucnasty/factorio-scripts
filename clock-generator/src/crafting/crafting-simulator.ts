import { fraction } from "fractionability";
import { MachineState } from "../state/machine-state";
import assert from "assert";

function simulateMachineCraftForTicks(
    machineState: MachineState,
    ticks: number
): MachineState {

    const clonedState = MachineState.clone(machineState)

    const machine = clonedState.machine;

    const currentBonusProgress = clonedState.bonusProgress.progress
    const currentCraftingProgress = clonedState.craftingProgress.progress

    const craftsPossible = machine.crafting_rate.crafts_per_tick
        .multiply(ticks)
        .add(currentCraftingProgress)

    const craftsWhole = Math.floor(craftsPossible.toDecimal());
    const remainderCrafts = craftsPossible.subtract(craftsWhole);

    const bonusCraftsPossible = machine.bonus_productivity_rate.bonus_crafts_per_tick
        .multiply(ticks)
        .add(currentBonusProgress);

    const bonusCraftsWhole = Math.floor(bonusCraftsPossible.toDecimal());
    const remainderBonusCrafts = bonusCraftsPossible.subtract(bonusCraftsWhole);


    // consume inputs
    machine.inputs.forEach(input => {
        const amount = input.consumption_rate.amount_per_craft * craftsWhole;
        clonedState.inventoryState.removeQuantity(input.ingredient.name, amount);
    })

    // produce outputs
    const baseCraftOutput = Math.floor(machine.crafting_rate.amount_per_craft.multiply(craftsWhole).toDecimal());
    const bonusCraftOutput = Math.floor(machine.bonus_productivity_rate.amount_per_bonus.multiply(bonusCraftsWhole).toDecimal());
    clonedState.inventoryState.addQuantity(machine.output.ingredient.name, baseCraftOutput + bonusCraftOutput);


    clonedState.craftingProgress.progress = remainderCrafts;
    clonedState.bonusProgress.progress = remainderBonusCrafts;

    if (!machineHasEnoughInputsForCraft(clonedState)) {
        // if we don't have enough inputs for another craft, reset progress to 0
        clonedState.craftingProgress.progress = fraction(0);
        clonedState.bonusProgress.progress = fraction(0);
    }

    return clonedState;
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

function machineInputIsBlocked(machineState: MachineState, ingredientName: string): boolean {

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