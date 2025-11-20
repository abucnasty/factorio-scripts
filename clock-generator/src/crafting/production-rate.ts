import Fraction, { fraction } from "fractionability";

export class ProductionRate {
    constructor(
        public readonly item: string,
        public readonly rate_per_second: Fraction,
        public readonly rate_per_tick: Fraction,
    ) { }


    limitTo(maxRatePerSecond: Fraction): ProductionRate {
        return new ProductionRate(this.item, maxRatePerSecond, maxRatePerSecond.divide(60));
    }
}


export class ProductionRateFactory {
    public static fromItemsPerSecond(item: string, rate_per_second: Fraction): ProductionRate {
        const rate_per_tick = rate_per_second.divide(60);
        return new ProductionRate(item, rate_per_second, rate_per_tick);
    }

    public static fromCraftingSpeed(item: string, craftingSpeed: number, craftingTime: number, resultAmount: number, productivity: number = 0) {
        const rate_per_second = fraction(resultAmount)
            .multiply(craftingSpeed)
            .multiply(1 + productivity)
            .divide(craftingTime);
        return this.fromItemsPerSecond(item, rate_per_second);
    }
}