import Fraction, { fraction } from "fractionability";
import { CraftingRate } from "./crafting-rate";

export interface BonusProductivityRate {
    readonly progress_per_second: Fraction;
    readonly progress_per_tick: Fraction;
    readonly bonus_crafts_per_tick: Fraction;
    readonly bonus_per_craft: Fraction;
    readonly ticks_per_bonus: Fraction;
    readonly amount_per_bonus: Fraction;
}

function createEmpty(): BonusProductivityRate {
    return {
        progress_per_second: fraction(0),
        progress_per_tick: fraction(0),
        bonus_crafts_per_tick: fraction(0),
        bonus_per_craft: fraction(0),
        ticks_per_bonus: fraction(0),
        amount_per_bonus: fraction(0)
    };
}

function fromCraftingRate(
    craftingRate: CraftingRate,
    productivityPercent: number
): BonusProductivityRate {
    // if the productivity percent is 0, there is no bonus productivity and thus no need to calculate further
    if (productivityPercent === 0) {
        return createEmpty();
    }

    // if the productivity percent is greater than 0, calculate the bonus productivity 
    // rate for example, if the productivity is 50%, then the bonus productivity will
    // occur every 2 crafts.
    // if the productivity is 100%, then the bonus productivity will occur every craft.
    // if the crafting rate is 120 ticks per craft, and the productivity is 50%, then
    // the bonus productivity will occur every 240 ticks.
    const productivity = fraction(productivityPercent).divide(100);
    const progressPerTick = craftingRate.crafts_per_tick.multiply(productivity);
    const progressPerSecond = progressPerTick.multiply(60);

    const bonusCraftsPerTick = craftingRate.crafts_per_tick.multiply(productivity);

    const amountPerBonus = craftingRate.amount_per_craft

    const ticksPerBonus = craftingRate.ticks_per_craft.multiply(productivity)

    const bonusPerCraft = craftingRate.amount_per_craft.multiply(productivity);

    return {
        progress_per_second: progressPerSecond,
        progress_per_tick: progressPerTick,
        bonus_crafts_per_tick: bonusCraftsPerTick,
        bonus_per_craft: bonusPerCraft,
        ticks_per_bonus: ticksPerBonus,
        amount_per_bonus: amountPerBonus
    };
}

export const BonusProductivityRate = { 
    fromCraftingRate: fromCraftingRate,
    createEmpty: createEmpty,
}