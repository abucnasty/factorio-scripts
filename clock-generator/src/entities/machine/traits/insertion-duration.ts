import Fraction, { fraction } from "fractionability";
import { ProductionRate } from "./production-rate";
import { OverloadMultiplier } from "../output";

/**
 * Represents a range of ticks during which an inserter can insert items.
 * 
 * TODO: consider removing
 */
export interface InsertionDuration {
    readonly tick_duration: Fraction;
}

function create(productionRate: ProductionRate, overloadMultiplier: OverloadMultiplier): InsertionDuration {
    return {
        tick_duration: fraction(overloadMultiplier.overload_multiplier).divide(productionRate.rate_per_tick)
    }
}

export const InsertionDuration = {
    create: create
};
