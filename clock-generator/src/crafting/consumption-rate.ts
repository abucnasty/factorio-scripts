import Fraction from "fractionability";

export interface ConsumptionRate {
    readonly item: string;
    readonly rate_per_second: Fraction;
    readonly rate_per_tick: Fraction;
    readonly amount_per_craft: number;
}


function fromCraftingSpeed(item: string, craftingSpeed: number, craftingTime: number, ingredientAmount: number): ConsumptionRate {
    const rate_per_second = new Fraction(ingredientAmount).multiply(craftingSpeed).divide(craftingTime);
    const rate_per_tick = rate_per_second.divide(60);
    return {
        item,
        rate_per_second,
        rate_per_tick,
        amount_per_craft: ingredientAmount,
    };
}

export const ConsumptionRate = {
    fromCraftingSpeed: fromCraftingSpeed,
}