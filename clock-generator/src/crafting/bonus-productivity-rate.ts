import Fraction, {fraction} from "fractionability";
import { CraftingRate } from "./crafting-rate";

export class BonusProductivityRate {
    constructor(
        public readonly progress_per_second: Fraction,
        public readonly progress_per_tick: Fraction,
        public readonly ticks_per_bonus: Fraction,
    ) {}
}


export class BonusProductivityRateFactory {

    public static fromCraftingRate(craftingRate: CraftingRate, productivityPercent: number): BonusProductivityRate {
        // if the productivity percent is 0, there is no bonus productivity and thus no need to calculate further
        if (productivityPercent === 0) {
            return new BonusProductivityRate(fraction(0), fraction(0), fraction(Infinity));
        }

        // if the productivity percent is greater than 0, calculate the bonus productivity rate
        // for example, if the productivity is 50%, then the bonus productivity will occur every 2 crafts
        // if the productivity is 100%, then the bonus productivity will occur every craft
        // if the crafting rate is 120 ticks per craft, and the productivity is 50%, then the bonus productivity will occur every 240 ticks
        const ticksPerBonus = craftingRate.ticks_per_craft.multiply(100).divide(productivityPercent);
        const progressPerSecond = fraction(60).divide(ticksPerBonus);
        const progressPerTick = progressPerSecond.divide(60);
        return new BonusProductivityRate(progressPerSecond, progressPerTick, ticksPerBonus);
    }
}