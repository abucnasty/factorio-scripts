import Fraction, {fraction} from "fractionability";
import { CraftingRate } from "./crafting-rate";

export class BonusProductivityRate {
    constructor(
        public readonly progress_per_second: Fraction,
        public readonly progress_per_tick: Fraction,
        public readonly bonus_crafts_per_tick: Fraction,
        public readonly bonus_per_craft: Fraction,
        public readonly ticks_per_bonus: Fraction,
        public readonly amount_per_bonus: Fraction
    ) {}
}


export class BonusProductivityRateFactory {

    public static createEmpty(): BonusProductivityRate {
        return new BonusProductivityRate(
            fraction(0),
            fraction(0),
            fraction(0),
            fraction(0),
            fraction(0),
            fraction(0)
        );
    }

    public static fromCraftingRate(
        craftingRate: CraftingRate,
        productivityPercent: number
    ): BonusProductivityRate {
        // if the productivity percent is 0, there is no bonus productivity and thus no need to calculate further
        if (productivityPercent === 0) {
            return this.createEmpty();
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
        const bonusPerTick = bonusPerCraft.divide(progressPerTick);
        

        return new BonusProductivityRate(
            progressPerSecond,
            progressPerTick,
            bonusCraftsPerTick,
            bonusPerCraft,
            ticksPerBonus,
            amountPerBonus
        );
    }
}