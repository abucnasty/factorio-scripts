import { fraction } from "fractionability";
import { InventoryItem, MachineState, MachineStatus, WritableInventoryState } from "../../../state";
import { MachineMode } from "./machine-mode";

export class MachineWorkingMode implements MachineMode {
    public readonly status = MachineStatus.WORKING;

    constructor(
        private readonly state: MachineState
    ) {}

    public onEnter(fromMode: MachineMode): void {
        this.resetProgress();
    }

    public onExit(toMode: MachineMode): void {
        this.resetProgress();
    }

    public executeForTick(): void {
        if (!this.hasEnoughInputsForCraft()) {
            this.resetProgress()
            return;
        }
        this.craftingLogic();
        this.bonusCraftingLogic();
    }

    private get inventory_state(): WritableInventoryState {
        return this.state.inventoryState;
    }

    private resetProgress() {
        this.state.craftingProgress.progress = fraction(0);
        this.state.bonusProgress.progress = fraction(0);
    }

    public get output_item(): Readonly<InventoryItem> {
        return this.inventory_state.getItemOrThrow(this.state.machine.output.ingredient.name);
    }

    public hasEnoughInputsForCraft(): boolean {
        const machine = this.state.machine;

        const recipe = machine.metadata.recipe;

        for (const ingredient of recipe.raw.ingredients) {
            const availableQuantity = this.inventory_state.getQuantity(ingredient.name);
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
            this.inventory_state.removeQuantity(input.ingredient.name, amount);
        })

        const baseCraftOutput = Math.floor(this.state.machine.crafting_rate.amount_per_craft.multiply(craftsWhole).toDecimal());

        this.inventory_state.addQuantity(this.state.machine.output.ingredient.name, baseCraftOutput);
        this.state.totalCrafted += baseCraftOutput;
    }

    private bonusCraftingLogic() {

        const currentBonusProgress = this.state.bonusProgress.progress

        const bonusCraftsPossible = this.state.machine.bonus_productivity_rate.bonus_crafts_per_tick
            .add(currentBonusProgress);

        const bonusCraftsWhole = Math.floor(bonusCraftsPossible.toDecimal());
        const remainderBonusCrafts = bonusCraftsPossible.subtract(bonusCraftsWhole);

        this.state.bonusProgress.progress = remainderBonusCrafts;

        const bonusCraftOutput = Math.floor(this.state.machine.bonus_productivity_rate.amount_per_bonus.multiply(bonusCraftsWhole).toDecimal());

        this.inventory_state.addQuantity(this.state.machine.output.ingredient.name, bonusCraftOutput);
        this.state.totalCrafted += bonusCraftOutput;
    }


}