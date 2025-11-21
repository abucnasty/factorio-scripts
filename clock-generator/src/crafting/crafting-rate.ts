import Fraction, { fraction } from "fractionability";

export class CraftingRate {
    constructor(
        public readonly ticks_per_craft: Fraction,
        public readonly crafts_per_tick: Fraction,
        public readonly amount_per_craft: Fraction,
        public readonly amount_per_tick: Fraction
    ) { }
}


export class CraftingRateFactory {
    public static fromCraftingSpeed(
        amountPerCraft: Fraction, 
        craftingSpeed: number, 
        energyRequired: number
    ): CraftingRate {
        const recipeTimeInSeconds = energyRequired;
        const ticksPerCraft = fraction(recipeTimeInSeconds).divide(craftingSpeed).multiply(60);
        const craftsPerTick = fraction(1).divide(ticksPerCraft);
        const amountPerTick = amountPerCraft.multiply(craftsPerTick);
        return new CraftingRate(
            ticksPerCraft, 
            craftsPerTick, 
            amountPerCraft,
            amountPerTick
        );
    }
}