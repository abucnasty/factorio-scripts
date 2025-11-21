import Fraction, { fraction } from "fractionability";
import assert from "assert"
import { Ingredient, ItemName, Recipe } from "../../../data/factorio-data-types";
import { FactorioDataService } from "../../../data/factorio-data-service";

export interface IngredientRatio {
    input: Ingredient;
    output: Ingredient;
    fraction: Fraction;
}

export interface RecipeMetadata {
    readonly name: string;
    readonly energy_required: number;
    readonly output: Ingredient;
    readonly inputToOutputRatios: Map<ItemName, IngredientRatio>;
    readonly outputToInputRatios: Map<ItemName, IngredientRatio>;
    readonly inputsPerCraft: Map<ItemName, Ingredient>;
    readonly raw: Recipe;
}

function fromRecipe(recipe: Recipe): RecipeMetadata {
    const {
        name,
        energy_required,
        ingredients,
        results
    } = recipe;


    assert(results.length === 1, `Only single-output recipes are supported. Recipe ${name} has ${results.length} outputs.`);

    const output = results[0];

    const outputItemAmount: Ingredient = {
        name: output.name,
        amount: output.amount,
        type: output.type,
    };

    const inputToOutputRatios: Map<ItemName, IngredientRatio> = new Map();
    const outputToInputRatios: Map<ItemName, IngredientRatio> = new Map();
    const inputsPerCraft: Map<ItemName, Ingredient> = new Map();

    ingredients.forEach(input => {
        inputToOutputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
            },
            output: outputItemAmount,
            fraction: fraction(input.amount, outputItemAmount.amount),
        });
        outputToInputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
            },
            output: outputItemAmount,
            fraction: fraction(outputItemAmount.amount, input.amount),
        });

        inputsPerCraft.set(input.name, {
            name: input.name,
            amount: input.amount,
            type: input.type,
        })
    })


    return {
        name,
        energy_required,
        output: outputItemAmount,
        inputToOutputRatios,
        outputToInputRatios,
        inputsPerCraft,
        raw: recipe,
    };
}

function fromRecipeName(recipeName: string): RecipeMetadata {
    const recipe = FactorioDataService.findRecipeOrThrow(recipeName);
    return fromRecipe(recipe);
}

export const RecipeMetadata = {
    fromRecipe,
    fromRecipeName,
}