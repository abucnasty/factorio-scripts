import Fraction, { fraction } from "fractionability";
import { Machine } from "./machine";
import { ProductionRate } from "./production-rate";


export class CraftingCycle {
    constructor(
        public readonly items_per_second: Fraction,
        public readonly items_per_tick: Fraction,
        public readonly items_per_cycle: Fraction,
        public readonly total_ticks: Fraction,
    ) { }
}

export class CraftingCycleFactory {
    public static fromItemsPerSecond(itemsPerSecond: Fraction, totalItems: Fraction): CraftingCycle {
        const itemsPerTick = itemsPerSecond.divide(60);

        const totalTicks = totalItems.divide(itemsPerTick);

        return new CraftingCycle(
            itemsPerSecond,
            itemsPerTick,
            totalItems,
            totalTicks
        );
    }

    public static fromProductionRate(productionRate: ProductionRate, stackSize: number): CraftingCycle {
        return this.fromItemsPerSecond(productionRate.rate_per_second, fraction(stackSize));
    }

    public static fromMachine(
        machine: Machine,
        stackSize: number,
    ): CraftingCycle {
        return this.fromProductionRate(machine.output.production_rate, stackSize);
    }
}