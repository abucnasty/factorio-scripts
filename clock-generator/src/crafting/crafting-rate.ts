import Fraction, { fraction } from "fractionability";

export interface CraftingRate {
    readonly ticks_per_craft: Fraction;
    readonly crafts_per_tick: Fraction;
    readonly amount_per_craft: Fraction;
    readonly amount_per_tick: Fraction;
}


function fromCraftingSpeed(
    amountPerCraft: Fraction,
    craftingSpeed: number,
    energyRequired: number
): CraftingRate {
    const recipeTimeInSeconds = energyRequired;
    const ticksPerCraft = fraction(recipeTimeInSeconds).divide(craftingSpeed).multiply(60);
    const craftsPerTick = fraction(1).divide(ticksPerCraft);
    const amountPerTick = amountPerCraft.multiply(craftsPerTick);
    return {
        ticks_per_craft: ticksPerCraft,
        crafts_per_tick: craftsPerTick,
        amount_per_craft: amountPerCraft,
        amount_per_tick: amountPerTick
    };
}

export const CraftingRate = {
    fromCraftingSpeed: fromCraftingSpeed,
}