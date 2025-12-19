import { fraction } from "fractionability"
import { MachineConfiguration } from "../../config/config";
import { AutomatedInsertionLimit, ConsumptionRate } from "./input";
import { MachineMetadata } from "./machine-metadata";
import { MachineOutput, OutputBlock, OverloadMultiplier, ProductionRate } from "./output";
import { RecipeMetadata } from "./recipe";
import { BonusProductivityRate, CraftingRate, InsertionDuration } from "./traits";
import { Entity } from "../entity";
import { EntityId } from "../entity-id";
import { Percentage } from "../../data-types/percent";
import { MachineInputs } from "./input/machine-inputs";


export class Machine implements Entity {

    public static fromConfig = fromConfig
    public static createMachine = createMachine
    public static printMachineFacts = printMachineFacts

    constructor(
        public readonly entity_id: EntityId,
        public readonly metadata: MachineMetadata,
        public readonly overload_multiplier: OverloadMultiplier,
        public readonly inputs: MachineInputs,
        public readonly output: MachineOutput,
        public readonly crafting_rate: CraftingRate,
        public readonly bonus_productivity_rate: BonusProductivityRate,
        public readonly insertion_duration: InsertionDuration,
    ) {}

    public toString(): string {
        return `Machine(${this.entity_id.id}, recipe=${this.metadata.recipe.name})`;
    }
}

function fromConfig(config: MachineConfiguration): Machine {
    return createMachine(config.id, {
        recipe: RecipeMetadata.fromRecipeName(config.recipe),
        productivity: config.productivity,
        crafting_speed: config.crafting_speed,
        type: config.type ?? "machine",
    });
}

function createMachine(
    id: number,
    metadata: MachineMetadata
): Machine {
    const recipe = metadata.recipe;
    const overload_multiplier = OverloadMultiplier.fromCraftingSpeed(metadata.crafting_speed, recipe.energy_required)

    const machineInputs = new MachineInputs(
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
            new Percentage(metadata.productivity),
        ),
        ingredient: recipe.output,
        outputBlock: OutputBlock.fromRecipe(metadata.type, recipe, overload_multiplier)
    };

    

    const insertionDurationPeriod = InsertionDuration.create(machineOutput.production_rate, overload_multiplier)

    const bonusProductivityRate = BonusProductivityRate.fromCraftingRate(craftingRate, new Percentage(metadata.productivity));
    return new Machine(
        EntityId.forMachine(id),
        metadata,
        overload_multiplier,
        machineInputs,
        machineOutput,
        craftingRate,
        bonusProductivityRate,
        insertionDurationPeriod
    );
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