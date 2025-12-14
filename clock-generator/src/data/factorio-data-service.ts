import fs from "fs";
import { FactorioData, Ingredient, Item, ItemName, MiningDrillSpec, Recipe, Resource, ResourceName } from "./factorio-data-types";
import { MiningDrillType } from "../entities/drill/mining-drill";
import assert from "assert";

export type EnrichedIngredient = Ingredient & {
    item: Item;
}

export interface EnrichedRecipe extends Recipe {
    ingredients: EnrichedIngredient[];
    results: EnrichedIngredient[];
}

export class FactorioDataService {

    private static factorio_data: FactorioData = FactorioDataService.readRawFromResourceFile();

    private static readRawFromResourceFile(): FactorioData {
        const file = fs.readFileSync("resources/data-filtered.json", "utf-8");
        return JSON.parse(file) as FactorioData;
    }

    public static readonly DEFAULT_ENERGY_REQUIRED = 0.5


    public static interceptor: Map<string, Item> = new Map([
        ["rail", { name: "rail", type: "item", stack_size: 100 }],
    ]);

    public static findRecipeOrThrow(recipeName: string): EnrichedRecipe {
        const recipe = this.factorio_data.recipe[recipeName]

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

    public static findItemOrThrow(itemName: ItemName): Item {
        const interceptor = this.interceptor.get(itemName);
        if(interceptor) {
            return interceptor
        }
        const item = this.factorio_data.item[itemName];
        const tool = this.factorio_data.tool[itemName];
        const module = this.factorio_data.module[itemName];
        const straight_rail = this.factorio_data["straight-rail"][itemName];

        if(!item && !tool && !module && !straight_rail) {
            throw new Error(`Item ${itemName} was not found`);
        }

        const result = item ?? tool ?? module ?? straight_rail;

        result.name = itemName;
        return result;
    }

    public static getMiningDrillSpec(type: MiningDrillType): MiningDrillSpec {
        const spec = this.factorio_data["mining-drill"][type];
        assert(spec, `Mining drill spec for type ${type} was not found`);
        return spec;
    }

    public static getResourceOrThrow(itemName: ResourceName): Resource {
        const resource = this.factorio_data["resource"][itemName];
        assert(resource, `Resource ${itemName} was not found`);
        return resource;
    }

}