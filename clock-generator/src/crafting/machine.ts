import { FactorioDataService } from "../data/factorio-data-service";
import { Recipe } from "../data/factorio-data-types";
import { AutomatedInsertionLimit, AutomatedInsertionLimitFactory } from "./automated-insertion-limit";
import { ConsumptionRate, ConsumptionRateFactory } from "./consumption-rate";
import { OverloadMultiplier, OverloadMultiplierFactory } from "./overload-multipliers";
import { ProductionRate, ProductionRateFactory } from "./production-rate";

export interface MachineMetadata {
    recipe: string;
    productivity: number;
    crafting_speed: number;
}

export class MachineInput {
    constructor(
        public readonly item_name: string,
        public readonly consumption_rate: ConsumptionRate,
        public readonly automated_insertion_limit: AutomatedInsertionLimit
    ) {}
}

export class MachineOutput {
    constructor(
        public readonly item_name: string,
        public readonly production_rate: ProductionRate,
    ) {}
}

export class Machine {
    public readonly overload_multiplier: OverloadMultiplier;

    public readonly inputs: Record<string, MachineInput>;

    public readonly output: MachineOutput
    
    constructor(
        public readonly id: number,
        public readonly metadata: MachineMetadata,
        public readonly recipe: Recipe
    ) {
        this.overload_multiplier = OverloadMultiplierFactory.fromCraftingSpeed(metadata.crafting_speed, recipe.energy_required)

        this.inputs = Object.fromEntries(
            recipe.ingredients.map(ingredient => {
                const limit = AutomatedInsertionLimitFactory.fromIngredient(ingredient, this.overload_multiplier);
                return [ingredient.name, new MachineInput(
                    ingredient.name,
                    ConsumptionRateFactory.fromCraftingSpeed(
                        ingredient.name,
                        metadata.crafting_speed,
                        recipe.energy_required,
                        ingredient.amount
                    ),
                    limit
                )];
            }
        ));

        this.output = new MachineOutput(
            recipe.results[0].name,
            ProductionRateFactory.fromCraftingSpeed(
                recipe.results[0].name,
                metadata.crafting_speed,
                recipe.energy_required,
                recipe.results[0].amount,
                metadata.productivity / 100
            )
        );
    }


    public clone(data: Partial<MachineMetadata>): Machine {
        return MachineFactory.createMachine(
            this.id,
            {...this.metadata, ...data}
        );
    }
}


export class MachineFactory {
    public static createMachine(
        id: number,
        metadata: MachineMetadata
    ): Machine {
        const recipe = FactorioDataService.findRecipeOrThrow(metadata.recipe);
        return new Machine(id, metadata, recipe);
    }
}