// 1.166 is a magic number representing the maximum number of seconds it takes for a base game inserter to do one cycle.
// the calculated overload multiplier is the number of crafts we can complete during one inserter full swing + 1
const dynamic_recipe_overload_factor = 1.166;

const minimum_recipe_overload_multiplier = 2;
const maximum_recipe_overload_multiplier = 100;

export class OverloadMultiplier {
    constructor(
        public readonly multiplier: number
    ) {}
}


export class OverloadMultiplierFactory {

    public static fromCraftingSpeed(craftingSpeed: number, energyRequired: number): OverloadMultiplier {

        const overloadMultiplier = Math.ceil(dynamic_recipe_overload_factor / (energyRequired / craftingSpeed)) + 1;

        if (overloadMultiplier < minimum_recipe_overload_multiplier) {
            return new OverloadMultiplier(minimum_recipe_overload_multiplier);
        }
        if (overloadMultiplier > maximum_recipe_overload_multiplier) {
            return new OverloadMultiplier(maximum_recipe_overload_multiplier);
        }
        return new OverloadMultiplier(overloadMultiplier);
    }
}