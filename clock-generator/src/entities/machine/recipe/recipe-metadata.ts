import Fraction, { fraction } from "fractionability";
import assert from "assert"
import { Ingredient, ItemName, Recipe } from "../../../data/factorio-data-types";
import { EnrichedIngredient, EnrichedRecipe, FactorioDataService } from "../../../data/factorio-data-service";

export interface IngredientRatio {
    input: EnrichedIngredient;
    output: EnrichedIngredient;
    fraction: Fraction;
}

export interface RecipeMetadata {
    readonly name: string;
    readonly energy_required: number;
    readonly output: EnrichedIngredient;
    readonly inputToOutputRatios: Map<ItemName, IngredientRatio>;
    readonly outputToInputRatios: Map<ItemName, IngredientRatio>;
    readonly inputsPerCraft: Map<ItemName, EnrichedIngredient>;
    readonly raw: EnrichedRecipe;
}

function fromRecipe(recipe: EnrichedRecipe): RecipeMetadata {
    const {
        name,
        energy_required,
        ingredients,
        results
    } = recipe;


    assert(results.length === 1, `Only single-output recipes are supported. Recipe ${name} has ${results.length} outputs.`);

    const output = results[0];

    const output_item: EnrichedIngredient = {
        name: output.name,
        amount: output.amount,
        type: output.type,
        item: output.item,
    };

    const inputToOutputRatios: Map<ItemName, IngredientRatio> = new Map();
    const outputToInputRatios: Map<ItemName, IngredientRatio> = new Map();
    const inputsPerCraft: Map<ItemName, EnrichedIngredient> = new Map();

    ingredients.forEach(input => {
        inputToOutputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
                item: input.item,
            },
            output: output_item,
            fraction: fraction(input.amount, output_item.amount),
        });
        outputToInputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
                item: input.item,
            },
            output: output_item,
            fraction: fraction(output_item.amount, input.amount),
        });

        inputsPerCraft.set(input.name, {
            name: input.name,
            amount: input.amount,
            type: input.type,
            item: input.item,
        })
    })


    return {
        name,
        energy_required,
        output: output_item,
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