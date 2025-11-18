import Fraction from "fractionability";
import { Machine } from "./machine";
import { ProductionRate } from "./production-rate";


export class CraftingCycle {
    constructor(
        public readonly items_per_second: Fraction,
        public readonly items_per_tick: Fraction,
        public readonly stack_size: number,
        public readonly total_ticks: Fraction,
    ) { }
}

export class CraftingCycleFactory {
    public static fromItemsPerSecond(itemsPerSecond: Fraction, stackSize: number): CraftingCycle {
        const itemsPerTick = itemsPerSecond.divide(60);

        const totalTicks = new Fraction(stackSize).divide(itemsPerTick);

        return new CraftingCycle(
            itemsPerSecond,
            itemsPerTick,
            stackSize,
            totalTicks
        );
    }

    public static fromProductionRate(productionRate: ProductionRate, stackSize: number): CraftingCycle {
        return this.fromItemsPerSecond(productionRate.rate_per_second, stackSize);
    }

    public static fromMachine(
        machine: Machine,
        stackSize: number,
    ): CraftingCycle {
        return this.fromProductionRate(machine.output.production_rate, stackSize);
    }
}