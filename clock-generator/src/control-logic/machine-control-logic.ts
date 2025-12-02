import { fraction } from "fractionability";
import { IngredientRatio, RecipeMetadata } from "../entities";
import { WritableInventoryState } from "../state/inventory-state";
import { MachineState, MachineStatus } from "../state/machine-state";
import { ControlLogic } from "./control-logic";


export type MachineStateChangeListener = (
    args: { state: MachineState, status: { from: MachineStatus, to: MachineStatus } }
) => void;

export type MachineCraftListener = (
    args: { state: MachineState, craftCount: number }
) => void;

export class MachineControlLogic implements ControlLogic {

    private readonly listeners: MachineStateChangeListener[] = [];
    private readonly craftListeners: MachineCraftListener[] = [];

    private readonly recipe: RecipeMetadata
    private readonly inventoryState: WritableInventoryState

    constructor(
        public readonly state: MachineState,
    ) {
        this.recipe = state.machine.metadata.recipe;
        this.inventoryState = state.inventoryState;
    }


    public executeForTick(): void {
        const previousStatus = this.state.status;
        const previousCraftCount = this.state.craftCount;

        if (!this.hasEnoughInputsForCraft()) {
            this.resetProgress();
        } else {
            this.craftingLogic();
            this.bonusCraftingLogic();
        }        

        const newStatus = this.computeStatus();
        this.state.status = newStatus;
        const newCraftCount = this.state.craftCount;

        if (newCraftCount !== previousCraftCount) {
            this.craftListeners.forEach(listener => listener({
                state: MachineState.clone(this.state),
                craftCount: newCraftCount - previousCraftCount
            }));
        }

        if (newStatus !== previousStatus) {
            this.listeners.forEach(listener => listener({
                state: MachineState.clone(this.state),
                status: {
                    from: previousStatus,
                    to: newStatus
                }
            }));
        }
    }

    public addStateChangeListener(listener: MachineStateChangeListener): void {
        this.listeners.push(listener);
    }

    public addCraftListener(listener: MachineCraftListener): void {
        this.craftListeners.push(listener);
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

        if (craftsWhole >= 1) {
            this.state.craftCount += craftsWhole;
        }

        this.state.machine.inputs.forEach(input => {
            const amount = input.consumption_rate.amount_per_craft * craftsWhole;
            this.inventoryState.removeQuantity(input.ingredient.name, amount);
        })

        const baseCraftOutput = Math.floor(this.state.machine.crafting_rate.amount_per_craft.multiply(craftsWhole).toDecimal());

        this.inventoryState.addQuantity(this.state.machine.output.ingredient.name, baseCraftOutput);
        this.state.totalCrafted += baseCraftOutput;
    }

    private computeStatus(): MachineStatus {

        const craftingProgress = this.state.craftingProgress.progress.toDecimal()

        if (!this.hasEnoughInputsForCraft() && this.output_item_amount > 0 && craftingProgress === 0) {
            return MachineStatus.OUTPUT_FULL;
        }

        if (!this.hasEnoughInputsForCraft() && craftingProgress === 0) {
            return MachineStatus.INGREDIENT_SHORTAGE;
        }

        return MachineStatus.WORKING;
    }

    private get output_item_amount(): number {
        return this.inventoryState.getQuantity(this.state.machine.output.ingredient.name);
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
        this.state.totalCrafted += bonusCraftOutput;
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