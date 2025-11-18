import Fraction, { fraction } from "fractionability";
import { MachineConfiguration } from "../config/config";
import { FactorioDataService } from "../data/factorio-data-service";
import { Ingredient, Recipe } from "../data/factorio-data-types";
import { AutomatedInsertionLimit, AutomatedInsertionLimitFactory } from "./automated-insertion-limit";
import { BonusProductivityRate, BonusProductivityRateFactory } from "./bonus-productivity-rate";
import { ConsumptionRate, ConsumptionRateFactory } from "./consumption-rate";
import { CraftingRate, CraftingRateFactory } from "./crafting-rate";
import { OverloadMultiplier, OverloadMultiplierFactory } from "./overload-multipliers";
import { ProductionRate, ProductionRateFactory } from "./production-rate";
import { InsertionDuration, InsertionDurationFactory } from "./insertion-duration";

export interface MachineMetadata {
    recipe: string;
    productivity: number;
    crafting_speed: number;
}

export class MachineInput {
    constructor(
        public readonly item_name: string,
        public readonly consumption_rate: ConsumptionRate,
        public readonly automated_insertion_limit: AutomatedInsertionLimit,
        public readonly ingredient: Ingredient
    ) {}
}

export class MachineOutput {
    constructor(
        public readonly item_name: string,
        public readonly amount_per_craft: Fraction,
        public readonly production_rate: ProductionRate,
        public readonly ingredient: Ingredient
    ) {}
}

export class Machine {
    
    constructor(
        public readonly id: number,
        public readonly metadata: MachineMetadata,
        public readonly recipe: Recipe,
        public readonly overload_multiplier: OverloadMultiplier,
        public readonly inputs: Record<string, MachineInput>,
        public readonly output: MachineOutput,
        public readonly crafting_rate: CraftingRate,
        public readonly bonus_productivity_rate: BonusProductivityRate,
        public readonly insertion_duration: InsertionDuration
    ) {}
}


export class MachineFactory {

    public static fromConfig(config: MachineConfiguration): Machine {
        return this.createMachine(config.id, {
            recipe: config.recipe,
            productivity: config.productivity,
            crafting_speed: config.crafting_speed,
        });
    }

    public static createMachine(
        id: number,
        metadata: MachineMetadata
    ): Machine {
        const recipe = FactorioDataService.findRecipeOrThrow(metadata.recipe);
        const overload_multiplier = OverloadMultiplierFactory.fromCraftingSpeed(metadata.crafting_speed, recipe.energy_required)
        const inputs = Object.fromEntries(
            recipe.ingredients.map(ingredient => {
                const limit = AutomatedInsertionLimitFactory.fromIngredient(ingredient, overload_multiplier);
                return [ingredient.name, new MachineInput(
                    ingredient.name,
                    ConsumptionRateFactory.fromCraftingSpeed(
                        ingredient.name,
                        metadata.crafting_speed,
                        recipe.energy_required,
                        ingredient.amount
                    ),
                    limit,
                    ingredient
                )];
            }
        ));

        if (recipe.results.length !== 1) {
            throw new Error(`MachineFactory currently only supports recipes with a single output. Recipe ${recipe.name} has ${recipe.results.length} outputs.`);
        }

        const resultIngredient = recipe.results[0];

        const output = new MachineOutput(
            resultIngredient.name,
            fraction(resultIngredient.amount).multiply(fraction(1).add(fraction(metadata.productivity).divide(100))),
            ProductionRateFactory.fromCraftingSpeed(
                resultIngredient.name,
                metadata.crafting_speed,
                recipe.energy_required,
                resultIngredient.amount,
                metadata.productivity / 100
            ),
            resultIngredient
        );

        const craftingRate = CraftingRateFactory.fromCraftingSpeed(
            metadata.crafting_speed,
            recipe.energy_required
        );

        const insertionDurationPeriod = InsertionDurationFactory.create(output.production_rate, overload_multiplier)

        const bonusProductivityRate = BonusProductivityRateFactory.fromCraftingRate(craftingRate, metadata.productivity);
        return new Machine(
            id,
            metadata,
            recipe,
            overload_multiplier,
            inputs,
            output,
            craftingRate,
            bonusProductivityRate,
            insertionDurationPeriod
        );
    }
}


export function printMachineFacts(machine: Machine): void {
    console.log(`--------------------------------------------------`)
    console.log(`Machine Facts:`);
    console.log(`  Recipe: ${machine.recipe.name}`);
    console.log(`  Crafting Speed: ${machine.metadata.crafting_speed}`);
    console.log(`  Productivity: ${machine.metadata.productivity}%`);
    console.log(`  Output Rate: ${machine.output.production_rate.rate_per_second.toMixedNumber()} per second`);
    console.log(`  Overload Multiplier: ${machine.overload_multiplier.multiplier.toString()}`);
    console.log(`  Ticks per craft: ${machine.crafting_rate.ticks_per_craft.toMixedNumber()} ticks`);
    console.log(`  Ticks per Bonus Craft: ${machine.bonus_productivity_rate.ticks_per_bonus.toMixedNumber()} ticks`);
    console.log(`  Insertion Duration before overload lockout: ${machine.insertion_duration.tick_duration.toMixedNumber()} ticks`);

    console.log(`ingredient consumption rate facts:`)
    for (const input of Object.values(machine.inputs)) {
        console.log(`  - ${input.item_name}: ${input.consumption_rate.rate_per_second.toMixedNumber()} per second`);
    }
}