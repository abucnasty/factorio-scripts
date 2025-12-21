import assert from "../../../common/assert";

// 1.166 is a magic number representing the maximum number of seconds it takes for a base game inserter to do one cycle.
// the calculated overload multiplier is the number of crafts we can complete during one inserter full swing + 1
const dynamic_recipe_overload_factor = 1.166;

const minimum_recipe_overload_multiplier = 2;
const maximum_recipe_overload_multiplier = 100;

export interface OverloadMultiplier {
    readonly overload_multiplier: number
}

function fromCraftingSpeed(craftingSpeed: number, energyRequired: number): OverloadMultiplier {

    assert(craftingSpeed > 0, "Crafting speed must be greater than zero");

    const overloadMultiplier = Math.ceil(dynamic_recipe_overload_factor / (energyRequired / craftingSpeed)) + 1;

    if (overloadMultiplier < minimum_recipe_overload_multiplier) {
        return { overload_multiplier: minimum_recipe_overload_multiplier };
    }
    if (overloadMultiplier > maximum_recipe_overload_multiplier) {
        return { overload_multiplier: maximum_recipe_overload_multiplier };
    }
    return { overload_multiplier: overloadMultiplier };
}


export const OverloadMultiplier = {
    fromCraftingSpeed: fromCraftingSpeed,
}