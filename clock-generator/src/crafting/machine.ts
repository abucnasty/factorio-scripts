import Fraction, { fraction } from "fractionability";
import { MachineConfiguration } from "../config/config";
import { Ingredient, ItemName, Recipe } from "../data/factorio-data-types";
import { AutomatedInsertionLimit, AutomatedInsertionLimitFactory } from "./automated-insertion-limit";
import { BonusProductivityRate, BonusProductivityRateFactory } from "./bonus-productivity-rate";
import { ConsumptionRate, ConsumptionRateFactory } from "./consumption-rate";
import { CraftingRate, CraftingRateFactory } from "./crafting-rate";
import { OverloadMultiplier, OverloadMultiplierFactory } from "./overload-multipliers";
import { ProductionRate, ProductionRateFactory } from "./production-rate";
import { InsertionDuration, InsertionDurationFactory } from "./insertion-duration";
import { OutputBlock } from "./output-block";
import { RecipeMetadata, RecipeMetadataFactory } from "./recipe";
import { InventoryState } from "../state/inventory-state";

export interface MachineMetadata {
    productivity: number;
    crafting_speed: number;
    recipe: RecipeMetadata;
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
        public readonly ingredient: Ingredient,
        public readonly outputBlock: OutputBlock
    ) {}
}

export class Machine {
    
    constructor(
        public readonly id: number,
        public readonly metadata: MachineMetadata,
        public readonly overload_multiplier: OverloadMultiplier,
        public readonly inputs: Map<ItemName, MachineInput>,
        public readonly output: MachineOutput,
        public readonly crafting_rate: CraftingRate,
        public readonly bonus_productivity_rate: BonusProductivityRate,
        public readonly insertion_duration: InsertionDuration,
    ) {}
}


export class MachineFactory {

    public static fromConfig(config: MachineConfiguration): Machine {
        return this.createMachine(config.id, {
            recipe: RecipeMetadataFactory.fromRecipeName(config.recipe),
            productivity: config.productivity,
            crafting_speed: config.crafting_speed,
        });
    }

    public static createMachine(
        id: number,
        metadata: MachineMetadata
    ): Machine {
        const recipe = metadata.recipe;
        const overload_multiplier = OverloadMultiplierFactory.fromCraftingSpeed(metadata.crafting_speed, recipe.energy_required)
        
        const inputs = new Map<ItemName, MachineInput>(
            recipe.raw.ingredients.map(ingredient => {
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
            })
        );

        const outputItem = recipe.output;

        const output = new MachineOutput(
            outputItem.name,
            fraction(outputItem.amount).multiply(fraction(1).add(fraction(metadata.productivity).divide(100))),
            ProductionRateFactory.fromCraftingSpeed(
                outputItem.name,
                metadata.crafting_speed,
                recipe.energy_required,
                outputItem.amount,
                metadata.productivity / 100,
            ),
            outputItem,
            OutputBlock.fromRecipe(recipe, overload_multiplier)
        );

        const craftingRate = CraftingRateFactory.fromCraftingSpeed(
            fraction(outputItem.amount),
            metadata.crafting_speed,
            recipe.energy_required
        );

        const insertionDurationPeriod = InsertionDurationFactory.create(output.production_rate, overload_multiplier)

        const bonusProductivityRate = BonusProductivityRateFactory.fromCraftingRate(craftingRate, metadata.productivity);
        return new Machine(
            id,
            metadata,
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
    console.log(`  Recipe: ${machine.metadata.recipe.name}`);
    console.log(`  Crafting Speed: ${machine.metadata.crafting_speed}`);
    console.log(`  Productivity: ${machine.metadata.productivity}%`);
    console.log(`  Output Per Craft: ${machine.output.amount_per_craft.toMixedNumber()}`);
    console.log(`  Output Rate: ${machine.output.production_rate.rate_per_second.toMixedNumber()} per second`);
    console.log(`  Overload Multiplier: ${machine.overload_multiplier.multiplier.toString()}`);
    console.log(`  Ticks per craft: ${machine.crafting_rate.ticks_per_craft.toMixedNumber()} ticks`);
    console.log(`  Ticks per Bonus Craft: ${machine.bonus_productivity_rate.ticks_per_bonus.toMixedNumber()} ticks`);
    console.log(`  Insertion Duration before overload lockout: ${machine.insertion_duration.tick_duration.toMixedNumber()} ticks`);

    console.log(`ingredient consumption rate facts:`)
    for (const input of machine.inputs.values()) {
        console.log(`  - ${input.item_name}: ${input.consumption_rate.rate_per_second.toMixedNumber()} per second`);
    }
}