import Fraction, { fraction } from "fractionability";
import { CraftingRate } from "./crafting-rate";
import { OverloadMultiplier } from "./overload-multipliers";
import { ProductionRate } from "./production-rate";

/**
 * Represents a range of ticks during which an inserter can insert items.
 */
export class InsertionDuration {
    constructor(
        public readonly tick_duration: Fraction
    ) {}
}

export class InsertionDurationFactory {

    public static create(craftingRate: ProductionRate, overloadMultiplier: OverloadMultiplier): InsertionDuration {
        const tickDurationBeforeOverloadLock = fraction(overloadMultiplier.multiplier).divide(craftingRate.rate_per_tick);

        return new InsertionDuration(
            tickDurationBeforeOverloadLock
        )
    }
}
   
