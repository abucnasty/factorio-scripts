import Fraction, { fraction } from "fractionability";
import assert from "../../../common/assert"
import { Ingredient, ItemName, Recipe, EnrichedIngredient, EnrichedRecipe, FactorioDataService } from "../../../data";
import { MapExtended } from "../../../data-types";

export interface IngredientRatio {
    input: EnrichedIngredient;
    output: EnrichedIngredient;
    fraction: Fraction;
}

export interface RecipeMetadata {
    readonly name: string;
    readonly energy_required: number;
    readonly output: EnrichedIngredient;
    readonly inputToOutputRatios: MapExtended<ItemName, IngredientRatio>;
    readonly outputToInputRatios: MapExtended<ItemName, IngredientRatio>;
    readonly inputsPerCraft: MapExtended<ItemName, EnrichedIngredient>;
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

    const inputToOutputRatios: MapExtended<ItemName, IngredientRatio> = new MapExtended();
    const outputToInputRatios: MapExtended<ItemName, IngredientRatio> = new MapExtended();
    const inputsPerCraft: MapExtended<ItemName, EnrichedIngredient> = new MapExtended();

    ingredients.forEach(input => {
        inputToOutputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
                item: input.item,
            },
            output: output_item,
            fraction: fraction(input.amount).divide(output_item.amount),
        });
        outputToInputRatios.set(input.name, {
            input: {
                name: input.name,
                amount: input.amount,
                type: input.type,
                item: input.item,
            },
            output: output_item,
            fraction: fraction(output_item.amount).divide(input.amount),
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