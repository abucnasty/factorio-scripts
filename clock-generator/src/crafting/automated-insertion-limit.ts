import { Ingredient } from "../data/factorio-data-types";
import { OverloadMultiplier } from "./overload-multipliers";

export class AutomatedInsertionLimit {
    constructor(
        public readonly quantity: number,
        public readonly item: string
    ) {}
}


export class AutomatedInsertionLimitFactory {

    public static fromIngredient(ingredient: Ingredient, machineOverloadMultiplier: OverloadMultiplier): AutomatedInsertionLimit {
        const quantity = Math.ceil(ingredient.amount * machineOverloadMultiplier.multiplier);
        return new AutomatedInsertionLimit(quantity, ingredient.name);
    }
}