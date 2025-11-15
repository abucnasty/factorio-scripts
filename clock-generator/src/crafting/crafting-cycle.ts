import Fraction from "fractionability";
import { Machine } from "./machine";


export class CraftingCycle {
    constructor(
        public readonly items_per_second: Fraction,
        public readonly items_per_tick: Fraction,
    ) {}
}


export class CraftingCycleFactory {
    public static fromItemsPerSecond(itemsPerSecond: Fraction): CraftingCycle {
        const itemsPerTick = itemsPerSecond.divide(60);
        return new CraftingCycle(itemsPerSecond, itemsPerTick);
    }

    public static fromMachine(
        machine: Machine
    ): CraftingCycle {

        const results = machine.recipe.results;
        if (results.length !== 1) {
            throw new Error("Only single-result recipes are supported");
        }
        const result = machine.recipe.results[0];

        const baseRecipeCraftPerSecond = new Fraction(result.amount, machine.recipe.energy_required);

        const withSpeedBonus = baseRecipeCraftPerSecond.multiply(machine.metadata.crafting_speed)
        const withProductivity = withSpeedBonus.multiply(
            new Fraction(1).add(
                new Fraction(machine.metadata.productivity, 100)
            )
        );
        
        return this.fromItemsPerSecond(withProductivity);
    }
}