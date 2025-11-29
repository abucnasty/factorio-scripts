import { fraction } from "fractionability";
import { IngredientRatio, RecipeMetadata } from "../entities";
import { WritableInventoryState } from "../state/inventory-state";
import { MachineState } from "../state/machine-state";
import { ControlLogic } from "./control-logic";

export class MachineControlLogic implements ControlLogic {

    private readonly recipe: RecipeMetadata
    private readonly inventoryState: WritableInventoryState

    constructor(
        public readonly state: MachineState,
    ) {
        this.recipe = state.machine.metadata.recipe;
        this.inventoryState = state.inventoryState;
    }


    public executeForTick(): void {
        this.craftingLogic();
        this.bonusCraftingLogic();
        if (!this.hasEnoughInputsForCraft()) {
            this.resetProgress();
        }
    }

    private hasEnoughInputsForCraft(): boolean {
        const machine = this.state.machine;

        const recipe = machine.metadata.recipe;

        for (const ingredient of recipe.raw.ingredients) {
            const availableQuantity = this.inventoryState.getQuantity(ingredient.name);
            const requiredQuantity = recipe.inputsPerCraft.get(ingredient.name)!.amount;
            if (availableQuantity < requiredQuantity) {
                return false;
            }
        }

        return true;
    }

    private craftingLogic() {
        const currentCraftingProgress = this.state.craftingProgress.progress

        const craftsPossible = this.state.machine.crafting_rate.crafts_per_tick
            .add(currentCraftingProgress)

        const craftsWhole = Math.floor(craftsPossible.toDecimal());
        const remainderCrafts = craftsPossible.subtract(craftsWhole);

        this.state.craftingProgress.progress = remainderCrafts;

        this.state.machine.inputs.forEach(input => {
            const amount = input.consumption_rate.amount_per_craft * craftsWhole;
            this.inventoryState.removeQuantity(input.ingredient.name, amount);
        })

        const baseCraftOutput = Math.floor(this.state.machine.crafting_rate.amount_per_craft.multiply(craftsWhole).toDecimal());

        this.inventoryState.addQuantity(this.state.machine.output.ingredient.name, baseCraftOutput);
    }

    private bonusCraftingLogic() {

        const currentBonusProgress = this.state.bonusProgress.progress

        const bonusCraftsPossible = this.state.machine.bonus_productivity_rate.bonus_crafts_per_tick
            .add(currentBonusProgress);

        const bonusCraftsWhole = Math.floor(bonusCraftsPossible.toDecimal());
        const remainderBonusCrafts = bonusCraftsPossible.subtract(bonusCraftsWhole);

        this.state.bonusProgress.progress = remainderBonusCrafts;

        const bonusCraftOutput = Math.floor(this.state.machine.bonus_productivity_rate.amount_per_bonus.multiply(bonusCraftsWhole).toDecimal());

        this.inventoryState.addQuantity(this.state.machine.output.ingredient.name, bonusCraftOutput);
    }

    private resetProgress() {
        this.state.craftingProgress.progress = fraction(0);
        this.state.bonusProgress.progress = fraction(0);
    }

    /**
     * determines the lowest input ingredient to determine 
     * the maximum output that can be crafted
     */
    private minimumInputIngredient(): IngredientRatio | null {
        return Array.from(this.recipe.outputToInputRatios.values())
            .reduce<IngredientRatio | null>((agg, current) => {

                if (agg == null) {
                    return current
                }

                const outputToInputRatio = current.fraction
                const currentInventoryAmount = this.state.inventoryState.getQuantity(current.input.name);

                const expectedOutput = Math.floor(outputToInputRatio.multiply(currentInventoryAmount).toDecimal())
                const aggExpectedOutput = Math.floor(agg.fraction.multiply(this.state.inventoryState.getQuantity(agg.input.name)).toDecimal())

                if (expectedOutput < aggExpectedOutput) {
                    return current;
                }

                return agg;
            }, null);
    }
}