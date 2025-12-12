import { fraction } from "fractionability"
import { MachineConfiguration } from "../../config/config";
import { ItemName } from "../../data/factorio-data-types";
import { AutomatedInsertionLimit, ConsumptionRate, MachineInput } from "./input";
import { MachineMetadata } from "./machine-metadata";
import { MachineOutput, OutputBlock, OverloadMultiplier, ProductionRate } from "./output";
import { RecipeMetadata } from "./recipe";
import { BonusProductivityRate, CraftingRate, InsertionDuration } from "./traits";
import { Entity } from "../entity";
import { EntityId } from "../entity-id";


export interface Machine extends Entity {
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

    const craftingRate = CraftingRate.fromCraftingSpeed(
        fraction(recipe.output.amount),
        metadata.crafting_speed,
        recipe.energy_required
    );

    const machineOutput: MachineOutput = {
        item_name: recipe.output.name,
        amount_per_craft: fraction(recipe.output.amount).multiply(fraction(1).add(fraction(metadata.productivity).divide(100))),
        production_rate: ProductionRate.fromCraftingRate(
            recipe.output.name,
            craftingRate,
            metadata.productivity / 100,
        ),
        ingredient: recipe.output,
        outputBlock: OutputBlock.fromRecipe(recipe, overload_multiplier)
    };

    

    const insertionDurationPeriod = InsertionDuration.create(machineOutput.production_rate, overload_multiplier)

    const bonusProductivityRate = BonusProductivityRate.fromCraftingRate(craftingRate, metadata.productivity);
    return {
        entity_id: EntityId.forMachine(id),
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
    console.log(`  Output Per Craft: ${machine.output.amount_per_craft.toDecimal().toFixed(2)}`);
    console.log(`  Output Rate: ${machine.output.production_rate.amount_per_second.toDecimal().toFixed(2)} per second`);
    console.log(`  Output Block: ${machine.output.outputBlock.quantity} ${machine.output.outputBlock.item_name}`);
    console.log(`  Overload Multiplier: ${machine.overload_multiplier.overload_multiplier.toString()}`);
    console.log(`  Ticks per craft: ${machine.crafting_rate.ticks_per_craft.toFixed(2)} ticks`);
    console.log(`  Ticks per Bonus Craft: ${machine.bonus_productivity_rate.ticks_per_bonus.toFixed(2)} ticks`);
    console.log(`  Insertion Duration before overload lockout: ${machine.insertion_duration.tick_duration.toDecimal().toFixed(2)} ticks`);

    console.log(`ingredient consumption rate facts:`)
    for (const input of machine.inputs.values()) {
        console.log(`  - ${input.item_name}: ${input.consumption_rate.rate_per_second.toFixed(2)} per second`);
    }

    console.log(`automated insertion limits:`)
    for (const input of machine.inputs.values()) {
        console.log(`  - ${input.item_name}: ${input.automated_insertion_limit.quantity}`);
    }
}

export const Machine = {
    fromConfig: fromConfig,
    createMachine: createMachine,
    printMachineFacts: printMachineFacts,
}