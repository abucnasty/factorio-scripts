import Fraction, { fraction } from "fractionability";

export class CraftingRate {
    constructor(
        public readonly ticks_per_craft: Fraction,
        public readonly crafts_per_tick: Fraction,
    ) { }
}


export class CraftingRateFactory {
    public static fromCraftingTime(craftingTime: number): CraftingRate {
        return new CraftingRate(new Fraction(craftingTime).multiply(60), fraction(1).divide(craftingTime));
    }

    public static fromCraftingSpeed(craftingSpeed: number, energyRequired: number): CraftingRate {
        const ticksPerCraft = new Fraction(energyRequired).divide(craftingSpeed).multiply(60);
        return new CraftingRate(ticksPerCraft, fraction(1).divide(ticksPerCraft));
    }
}