import data from "../resources/data-raw-dump.json" with { type: 'json' };

export function findRecipeOrThrow(recipeName) {
    const recipe = data.recipe[recipeName]

    if (!recipe) {
        throw new Error(`Recipe ${recipeName} was not found`)
    }

    return recipe
}