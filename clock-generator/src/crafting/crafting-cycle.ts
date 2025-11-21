import Fraction, { fraction } from "fractionability";
import { Machine } from "./machine";
import { ProductionRate } from "./production-rate";


export interface CraftingCycle {
    readonly items_per_second: Fraction;
    readonly items_per_tick: Fraction;
    readonly items_per_cycle: Fraction;
    readonly total_ticks: Fraction;
}

function fromItemsPerSecond(itemsPerSecond: Fraction, totalItems: Fraction): CraftingCycle {
    const itemsPerTick = itemsPerSecond.divide(60);

    const totalTicks = totalItems.divide(itemsPerTick);

    return {
        items_per_second: itemsPerSecond,
        items_per_tick: itemsPerTick,
        items_per_cycle: totalItems,
        total_ticks: totalTicks
    };
}

function fromProductionRate(productionRate: ProductionRate, stackSize: number): CraftingCycle {
    return fromItemsPerSecond(productionRate.rate_per_second, fraction(stackSize));
}

function fromMachine(
    machine: Machine,
    stackSize: number,
): CraftingCycle {
    return fromProductionRate(machine.output.production_rate, stackSize);
}

export const CraftingCycle = {
    fromItemsPerSecond: fromItemsPerSecond,
    fromProductionRate: fromProductionRate,
    fromMachine: fromMachine,
}
