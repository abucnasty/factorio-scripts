import { FactorioData, Recipe } from "./factorio-data-types";
import { data } from "./factorio-raw-dump";

export class FactorioDataService {

    public static readonly DEFAULT_ENERGY_REQUIRED = 0.5

    private static readRawDump(): FactorioData {
        return data as FactorioData;
    }

    public static findRecipeOrThrow(recipeName: string): Recipe {
        const recipe = this.readRawDump().recipe[recipeName]

        if (!recipe) {
            throw new Error(`Recipe ${recipeName} was not found`)
        }

        return {
            ...recipe,
            ingredients: recipe.ingredients.filter(it => it.type != "fluid"),
            results: recipe.results.filter(it => it.type != "fluid"),
            energy_required: recipe.energy_required ?? this.DEFAULT_ENERGY_REQUIRED,
        }
    }

}