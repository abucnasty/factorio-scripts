import Fraction, { fraction } from "fractionability";

export interface CraftingRate {
    readonly ticks_per_craft: number;
    readonly crafts_per_tick: number;
    readonly amount_per_craft: number;
    readonly amount_per_tick: number;
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
        ticks_per_craft: ticksPerCraft.toDecimal(),
        crafts_per_tick: craftsPerTick.toDecimal(),
        amount_per_craft: amountPerCraft.toDecimal(),
        amount_per_tick: amountPerTick.toDecimal()
    };
}

export const CraftingRate = {
    fromCraftingSpeed: fromCraftingSpeed,
}