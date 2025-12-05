import { P } from "vitest/dist/chunks/rpc.d.RH3apGEf";
import { FactorioData, Ingredient, Item, ItemName, Recipe } from "./factorio-data-types";
import { data } from "./factorio-raw-dump";

export type EnrichedIngredient = Ingredient & {
    item: Item;
}

export interface EnrichedRecipe extends Recipe {
    ingredients: EnrichedIngredient[];
    results: EnrichedIngredient[];
}

export class FactorioDataService {

    public static readonly DEFAULT_ENERGY_REQUIRED = 0.5

    private static readRawDump(): FactorioData {
        return data as FactorioData;
    }

    public static findRecipeOrThrow(recipeName: string): EnrichedRecipe {
        const recipe = this.readRawDump().recipe[recipeName]

        if (!recipe) {
            throw new Error(`Recipe ${recipeName} was not found`)
        }

        const enriched_ingredients: EnrichedIngredient[] = recipe.ingredients
            .filter(it => it.type != "fluid")
            .map(ingredient => {
                const item = this.findItemOrThrow(ingredient.name);
                return {
                    ...ingredient,
                    item: item,
                }
            })

        const enriched_results: EnrichedIngredient[] = recipe.results
            .filter(it => it.type != "fluid")
            .map(result => {
                const item = this.findItemOrThrow(result.name);
                return {
                    ...result,
                    item: item,
                }
            })

        return {
            ...recipe,
            ingredients: enriched_ingredients,
            results: enriched_results,
            energy_required: recipe.energy_required ?? this.DEFAULT_ENERGY_REQUIRED,
        }
    }

    public static findItemOrThrow(itemName: ItemName) {
        const item = this.readRawDump().item[itemName];
        const tool = this.readRawDump().tool[itemName];

        if(!item && !tool) {
            throw new Error(`Item ${itemName} was not found`);
        }

        return item ?? tool;
    }

}