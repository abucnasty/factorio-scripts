import { ItemName } from "../data/factorio-data-types";
import { OverloadMultiplier } from "./overload-multipliers";
import { RecipeMetadata } from "./recipe";

export class OutputBlock {

    public static fromRecipe(
        recipe: RecipeMetadata,
        overloadMultiplier: OverloadMultiplier
    ): OutputBlock {
        const output = recipe.output
        const outputBlock = overloadMultiplier.multiplier * output.amount

        return new OutputBlock(
            output.name,
            outputBlock
        );
    }

    private constructor(
        public readonly item_name: ItemName,
        public readonly quantity: number
    ) {}
}