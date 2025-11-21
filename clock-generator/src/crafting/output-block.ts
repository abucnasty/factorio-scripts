import { ItemName } from "../data/factorio-data-types";
import { OverloadMultiplier } from "./overload-multipliers";
import { RecipeMetadata } from "./recipe";

export interface OutputBlock {
    readonly item_name: ItemName;
    readonly quantity: number;
}

export const OutputBlock = {
    fromRecipe(recipe: RecipeMetadata, overloadMultiplier: OverloadMultiplier): OutputBlock {
        return {
            item_name: recipe.output.name,
            quantity: overloadMultiplier.overload_multiplier * recipe.output.amount
        };
    }
};