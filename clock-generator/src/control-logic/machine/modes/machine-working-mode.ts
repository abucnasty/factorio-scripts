import { InventoryItem, MachineState, MachineStatus, WritableInventoryState } from "../../../state";
import { MachineMode } from "./machine-mode";

export class MachineWorkingMode implements MachineMode {
    public readonly status = MachineStatus.WORKING;

    private remaining_crafts: number = 0;

    constructor(
        private readonly state: MachineState
    ) { }

    public onEnter(fromMode: MachineMode): void {}

    public onExit(toMode: MachineMode): void {}

    public executeForTick(): void {
        this.computeRemainingCrafts();
        if (!this.hasEnoughInputsForCraft()) {
            return;
        }
        this.craftingLogic();
        this.computeRemainingCrafts();

        if (this.state.craftingProgress.progress >= 1) {
            console.warn("Crafting progress exceeded 1 in working mode");
        }
    }

    private get inventory_state(): WritableInventoryState {
        return this.state.inventoryState;
    }

    public get output_item(): Readonly<InventoryItem> {
        return this.inventory_state.getItemOrThrow(this.state.machine.output.ingredient.name);
    }

    public hasEnoughInputsForCraft(): boolean {
        this.computeRemainingCrafts();
        return this.remaining_crafts > 0;
    }

    private computeRemainingCrafts(): void {
        const machine = this.state.machine;

        const max_item_stack_size = machine.output.ingredient.item.stack_size

        const recipe = machine.metadata.recipe;

        let remaining_crafts_from_inputs = Infinity;

        for (const ingredient of recipe.raw.ingredients) {
            const availableQuantity = this.inventory_state.getQuantity(ingredient.name);
            const requiredQuantity = recipe.inputsPerCraft.get(ingredient.name)!.amount;
            remaining_crafts_from_inputs = Math.min(remaining_crafts_from_inputs, availableQuantity / requiredQuantity)
        }


        const current_output_quantity = this.inventory_state.getQuantity(machine.output.ingredient.name);
        const output_amount_per_craft = machine.output.ingredient.amount;
        const available_output_space = max_item_stack_size - current_output_quantity;
        const possible_crafts_from_output_space = Math.floor(available_output_space / output_amount_per_craft);

        this.remaining_crafts = Math.min(remaining_crafts_from_inputs, possible_crafts_from_output_space);
    }

    private craftsPossibleThisTick(): number {
        const current_craft_progress = this.state.craftingProgress.progress
        const crafts_per_tick = this.state.machine.crafting_rate.crafts_per_tick
        const remaining_crafts = this.remaining_crafts

        const crafts_possible = crafts_per_tick + current_craft_progress

        if (crafts_possible > remaining_crafts) {
            // more crafts are possible than inputs allow
            return remaining_crafts - current_craft_progress;
        }
        return crafts_possible - current_craft_progress;
    }

    private bonusCraftsPossibleThisTick(): number {
        const crafts_possible_this_tick = this.craftsPossibleThisTick()
        const bonus_per_craft = this.state.machine.bonus_productivity_rate.bonus_per_craft
        
        return crafts_possible_this_tick * bonus_per_craft
    }

    private craftingLogic() {
        const crafts_possible = this.craftsPossibleThisTick()
        const progress = this.state.craftingProgress.progress + crafts_possible
        const crafts_whole = Math.floor(progress);
        const crafts_remainder = progress - crafts_whole;
        this.state.craftingProgress.progress = crafts_remainder;

        const amount_per_craft = this.state.machine.output.ingredient.amount;
        const craft_output = Math.floor(amount_per_craft * crafts_whole);
        this.inventory_state.addQuantity(this.state.machine.output.ingredient.name, craft_output);
        this.state.totalCrafted += craft_output;
        // bonus
        const bonus_per_craft = this.state.machine.bonus_productivity_rate.bonus_per_craft
        const bonus_crafts_possible = crafts_possible * bonus_per_craft
        const bonus_progress = this.state.bonusProgress.progress + bonus_crafts_possible
        const bonus_crafts_whole = Math.floor(bonus_progress);
        const bonus_crafts_remainder = bonus_progress - bonus_crafts_whole;
        this.state.bonusProgress.progress = bonus_crafts_remainder;

        const amount_per_bonus = this.state.machine.output.ingredient.amount;
        const bonus_craft_output = Math.floor(amount_per_bonus * bonus_crafts_whole)
        this.inventory_state.addQuantity(this.state.machine.output.ingredient.name, bonus_craft_output);
        this.state.totalCrafted += bonus_craft_output;

        // conume inputs
        if (crafts_whole >= 1) {
            this.state.craftCount += crafts_whole;
            this.consumeInputsForCraftCount(crafts_whole);
        }
    }

    private consumeInputsForCraftCount(crafts: number): void {
        this.state.machine.inputs.forEach(input => {
            this.inventory_state.removeQuantity(
                input.ingredient.name, 
                input.consumption_rate.amount_per_craft * crafts
            );
        })
    }
}