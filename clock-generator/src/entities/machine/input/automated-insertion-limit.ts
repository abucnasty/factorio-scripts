import { Ingredient } from "../../../data";
import { OverloadMultiplier } from "../output";

export interface AutomatedInsertionLimit {
    readonly quantity: number;
    readonly item: string;
}

function fromIngredient(ingredient: Ingredient, machineOverloadMultiplier: OverloadMultiplier): AutomatedInsertionLimit {
    const quantity = Math.ceil(ingredient.amount * machineOverloadMultiplier.overload_multiplier);
    return { quantity, item: ingredient.name };
}

export const AutomatedInsertionLimit = {
    fromIngredient: fromIngredient
}