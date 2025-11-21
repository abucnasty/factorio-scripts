import Fraction, { fraction } from "fractionability";
import { MachineConfiguration } from "../config/config";
import { Ingredient, ItemName } from "../data/factorio-data-types";
import { AutomatedInsertionLimit } from "./automated-insertion-limit";
import { BonusProductivityRate } from "./bonus-productivity-rate";
import { ConsumptionRate } from "./consumption-rate";
import { CraftingRate } from "./crafting-rate";
import { OverloadMultiplier } from "./overload-multipliers";
import { ProductionRate } from "./production-rate";
import { InsertionDuration } from "./insertion-duration";
import { OutputBlock } from "./output-block";
import { RecipeMetadata } from "./recipe";

export interface MachineMetadata {
    productivity: number;
    crafting_speed: number;
    recipe: RecipeMetadata;
}

export interface MachineInput {
    readonly item_name: string;
    readonly consumption_rate: ConsumptionRate;
    readonly automated_insertion_limit: AutomatedInsertionLimit;
    readonly ingredient: Ingredient;
}

export interface MachineOutput {
    readonly item_name: string;
    readonly amount_per_craft: Fraction;
    readonly production_rate: ProductionRate;
    readonly ingredient: Ingredient;
    readonly outputBlock: OutputBlock;
}


export interface Machine {
    readonly id: number;
    readonly metadata: MachineMetadata,
    readonly overload_multiplier: OverloadMultiplier,
    readonly inputs: Map<ItemName, MachineInput>,
    readonly output: MachineOutput,
    readonly crafting_rate: CraftingRate,
    readonly bonus_productivity_rate: BonusProductivityRate,
    readonly insertion_duration: InsertionDuration,
}

function fromConfig(config: MachineConfiguration): Machine {
    return createMachine(config.id, {
        recipe: RecipeMetadata.fromRecipeName(config.recipe),
        productivity: config.productivity,
        crafting_speed: config.crafting_speed,
    });
}

function createMachine(
    id: number,
    metadata: MachineMetadata
): Machine {
    const recipe = metadata.recipe;
    const overload_multiplier = OverloadMultiplier.fromCraftingSpeed(metadata.crafting_speed, recipe.energy_required)

    const machineInputs = new Map<ItemName, MachineInput>(
        recipe.raw.ingredients.map(ingredient => {
            return [ingredient.name, {
                item_name: ingredient.name,
                consumption_rate: ConsumptionRate.fromCraftingSpeed(
                    ingredient.name,
                    metadata.crafting_speed,
                    recipe.energy_required,
                    ingredient.amount
                ),
                automated_insertion_limit: AutomatedInsertionLimit.fromIngredient(ingredient, overload_multiplier),
                ingredient: ingredient
            }];
        })
    );

    const machineOutput: MachineOutput = {
        item_name: recipe.output.name,
        amount_per_craft: fraction(recipe.output.amount).multiply(fraction(1).add(fraction(metadata.productivity).divide(100))),
        production_rate: ProductionRate.fromCraftingSpeed(
            recipe.output.name,
            metadata.crafting_speed,
            recipe.energy_required,
            recipe.output.amount,
            metadata.productivity / 100,
        ),
        ingredient: recipe.output,
        outputBlock: OutputBlock.fromRecipe(recipe, overload_multiplier)
    };

    const craftingRate = CraftingRate.fromCraftingSpeed(
        fraction(recipe.output.amount),
        metadata.crafting_speed,
        recipe.energy_required
    );

    const insertionDurationPeriod = InsertionDuration.create(machineOutput.production_rate, overload_multiplier)

    const bonusProductivityRate = BonusProductivityRate.fromCraftingRate(craftingRate, metadata.productivity);
    return {
        id,
        metadata,
        overload_multiplier,
        inputs: machineInputs,
        output: machineOutput,
        crafting_rate: craftingRate,
        bonus_productivity_rate: bonusProductivityRate,
        insertion_duration: insertionDurationPeriod
    };
}

function printMachineFacts(machine: Machine): void {
    console.log(`--------------------------------------------------`)
    console.log(`Machine Facts:`);
    console.log(`  Recipe: ${machine.metadata.recipe.name}`);
    console.log(`  Crafting Speed: ${machine.metadata.crafting_speed}`);
    console.log(`  Productivity: ${machine.metadata.productivity}%`);
    console.log(`  Output Per Craft: ${machine.output.amount_per_craft.toMixedNumber()}`);
    console.log(`  Output Rate: ${machine.output.production_rate.rate_per_second.toMixedNumber()} per second`);
    console.log(`  Overload Multiplier: ${machine.overload_multiplier.overload_multiplier.toString()}`);
    console.log(`  Ticks per craft: ${machine.crafting_rate.ticks_per_craft.toMixedNumber()} ticks`);
    console.log(`  Ticks per Bonus Craft: ${machine.bonus_productivity_rate.ticks_per_bonus.toMixedNumber()} ticks`);
    console.log(`  Insertion Duration before overload lockout: ${machine.insertion_duration.tick_duration.toMixedNumber()} ticks`);

    console.log(`ingredient consumption rate facts:`)
    for (const input of machine.inputs.values()) {
        console.log(`  - ${input.item_name}: ${input.consumption_rate.rate_per_second.toMixedNumber()} per second`);
    }
}

export const Machine = {
    fromConfig: fromConfig,
    createMachine: createMachine,
    printMachineFacts: printMachineFacts,
}