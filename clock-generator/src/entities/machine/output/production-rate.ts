import Fraction, { fraction } from "fractionability";
import { TICKS_PER_SECOND } from "../../../data-types";

export interface ProductionRate {
    readonly item: string;
    readonly rate_per_second: Fraction;
    readonly rate_per_tick: Fraction;
}


function limitTo(productionRate: ProductionRate, maxRatePerSecond: Fraction): ProductionRate {
    return {
        item: productionRate.item,
        rate_per_second: maxRatePerSecond,
        rate_per_tick: maxRatePerSecond.divide(60)
    };
}


function fromItemsPerSecond(item: string, rate_per_second: Fraction): ProductionRate {
    const rate_per_tick = rate_per_second.divide(60);
    return {
        item,
        rate_per_second,
        rate_per_tick
    };
}

function fromItemsPerTick(item: string, rate_per_tick: Fraction): ProductionRate {
    const rate_per_second = rate_per_tick.multiply(TICKS_PER_SECOND);
    return {
        item,
        rate_per_second,
        rate_per_tick
    };
}

function fromCraftingSpeed(item: string, craftingSpeed: number, craftingTime: number, resultAmount: number, productivity: number = 0) {
    const rate_per_second = fraction(resultAmount)
        .multiply(craftingSpeed)
        .multiply(1 + productivity)
        .divide(craftingTime);
    return fromItemsPerSecond(item, rate_per_second);
}

export const ProductionRate = {
    limitTo: limitTo,
    perSecond: fromItemsPerSecond,
    perTick: fromItemsPerTick,
    fromCraftingSpeed
}