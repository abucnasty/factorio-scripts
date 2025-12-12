import { describe, test, expect } from "vitest"
import { RecipeMetadata } from "./recipe-metadata"
import { Ingredient } from "../../../data/factorio-data-types"

describe("Recipe Metadata", () => {

    const filterToOnlyIngredientProps = (ingredient: Ingredient) => {
        return {
            type: ingredient.type,
            name: ingredient.name,
            amount: ingredient.amount
        }
    }

    test("creates recipe metadata from recipe name", () => {
        const recipeMetadata = RecipeMetadata.fromRecipeName("iron-gear-wheel")
        expect(recipeMetadata.name).toBe("iron-gear-wheel")
    })

    test("throws an error for unknown recipe", () => {
        expect(() => RecipeMetadata.fromRecipeName("unknown-recipe")).toThrowError("Recipe unknown-recipe was not found")
    })

    test("retrieves ingredients correctly", () => {
        const recipeMetadata = RecipeMetadata.fromRecipeName("iron-gear-wheel")
        const ingredients: Ingredient[] = Array.from(recipeMetadata.inputsPerCraft.values()).map(input => input)
        
        expect(ingredients.map(filterToOnlyIngredientProps)).toEqual([
            { type: "item", name: "iron-plate", amount: 2 }
        ])
    })

    test("filters out fluid ingredients", () => {
        const recipeMetadata = RecipeMetadata.fromRecipeName("plastic-bar")
        const ingredients: Ingredient[] = Array.from(recipeMetadata.inputsPerCraft.values()).map(input => input)
        expect(ingredients.map(filterToOnlyIngredientProps)).toEqual([
            { type: "item", name: "coal", amount: 1 }
        ])
        expect(ingredients.map(it => it.name)).not.toContain("petroleum-gas")
    })

    test("uses default energy required if not specified", () => {
        const recipeMetadata = RecipeMetadata.fromRecipeName("iron-gear-wheel")
        expect(recipeMetadata.energy_required).toBe(0.5)
    })
})