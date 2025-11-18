import Fraction from "fractionability";

export class ConsumptionRate {
    constructor(
        public readonly item: string,
        public readonly rate_per_second: Fraction,
        public readonly rate_per_tick: Fraction,
    ) {}

    limitTo(maxRatePerSecond: Fraction): ConsumptionRate {
        return new ConsumptionRate(this.item, maxRatePerSecond, maxRatePerSecond.divide(60));
    }
}


export class ConsumptionRateFactory {
    public static fromPerSecond(item: string, rate_per_second: number): ConsumptionRate {
        const rate_per_second_fraction = new Fraction(rate_per_second);
        const rate_per_tick = rate_per_second_fraction.divide(60);
        return new ConsumptionRate(item, rate_per_second_fraction, rate_per_tick);
    }

    public static fromCraftingSpeed(item: string, craftingSpeed: number, craftingTime: number, ingredientAmount: number) {
        const rate_per_second = new Fraction(ingredientAmount).multiply(craftingSpeed).divide(craftingTime);
        const rate_per_tick = rate_per_second.divide(60);
        return new ConsumptionRate(item, rate_per_second, rate_per_tick);
    }
}