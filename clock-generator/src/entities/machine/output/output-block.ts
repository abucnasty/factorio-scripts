import { ItemName } from "../../../data/factorio-data-types";
import { RecipeMetadata } from "../recipe";
import { OverloadMultiplier } from "../traits/overload-multiplier";

export interface OutputBlock {
    readonly item_name: ItemName;
    readonly quantity: number;
    readonly max_stack_size: number;
}

export const OutputBlock = {
    fromRecipe(recipe: RecipeMetadata, overloadMultiplier: OverloadMultiplier): OutputBlock {
        return {
            item_name: recipe.output.name,
            quantity: overloadMultiplier.overload_multiplier * recipe.output.amount,
            max_stack_size: recipe.output.item.stack_size,
        };
    }
};