import Fraction, { fraction } from "fractionability";
import { Ingredient, ItemName, Recipe } from "../data/factorio-data-types";
import assert from "assert"
import { FactorioDataService } from "../data/factorio-data-service";

export interface IngredientRatio {
    input: Ingredient;
    output: Ingredient;
    fraction: Fraction;
}

export class RecipeMetadata {
    constructor(
        public readonly name: string,
        public readonly energy_required: number,
        public readonly output: Ingredient,
        public readonly inputToOutputRatios: Map<ItemName, IngredientRatio>,
        public readonly outputToInputRatios: Map<ItemName, IngredientRatio>,
        public readonly inputsPerCraft: Map<ItemName, Ingredient>,
        public readonly raw: Recipe,
    ) {}
}


export class RecipeMetadataFactory {

    public static fromRecipeName(recipeName: string): RecipeMetadata {
        const recipe = FactorioDataService.findRecipeOrThrow(recipeName);
        return this.fromRecipe(recipe);
    }

    public static fromRecipe(recipe: Recipe): RecipeMetadata {
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


        return new RecipeMetadata(
            name,
            energy_required,
            outputItemAmount,
            inputToOutputRatios,
            outputToInputRatios,
            inputsPerCraft,
            recipe,
        )

    }

    
}