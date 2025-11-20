import { ItemName, Recipe } from "../data/factorio-data-types";
import { CraftingRate } from "./crafting-rate";
import { Machine, MachineOutput } from "./machine";
import { OverloadMultiplier } from "./overload-multipliers";
import assert from "assert";

export class OutputBlock {

    public static fromRecipe(
        recipe: Recipe,
        overloadMultiplier: OverloadMultiplier
    ): OutputBlock {

        const results = recipe.results;
        assert(results.length === 1, `Expected exactly one output result for recipe ${recipe.name}, but got ${results.length}`);

        const recipeResult = results[0];
        const outputBlock = overloadMultiplier.multiplier * recipeResult.amount

        return new OutputBlock(
            recipeResult.name,
            outputBlock
        );
    }

    private constructor(
        public readonly item_name: ItemName,
        public readonly quantity: number
    ) {}
}