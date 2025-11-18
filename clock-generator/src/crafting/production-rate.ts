import Fraction, {fraction} from "fractionability";

export class ProductionRate {
    constructor(
        public readonly item: string,
        public readonly rate_per_second: Fraction,
        public readonly rate_per_tick: Fraction,
    ) {}


    limitTo(maxRatePerSecond: Fraction): ProductionRate {
        return new ProductionRate(this.item, maxRatePerSecond, maxRatePerSecond.divide(60));
    }
}


export class ProductionRateFactory {
    public static fromPerSecond(item: string, rate_per_second: number): ProductionRate {
        const rate_per_second_fraction = fraction(rate_per_second);
        const rate_per_minute = rate_per_second_fraction.multiply(60);
        return new ProductionRate(item, rate_per_second_fraction, rate_per_minute);
    }

    public static fromCraftingSpeed(item: string, craftingSpeed: number, craftingTime: number, resultAmount: number, productivity: number = 0) {
        const rate_per_second = fraction(resultAmount).multiply(craftingSpeed).multiply(1 + productivity).divide(craftingTime);
        const rate_per_tick = rate_per_second.divide(60);
        return new ProductionRate(item, rate_per_second, rate_per_tick);
    }
}