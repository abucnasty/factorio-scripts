import { InventoryItem, MachineState, MachineStatus, WritableInventoryState } from "../../../state";
import { MachineMode } from "./machine-mode";

export class MachineWorkingMode implements MachineMode {
    public readonly status = MachineStatus.WORKING;

    private remaining_crafts: number = 0;

    constructor(
        private readonly state: MachineState
    ) { }

    public onEnter(fromMode: MachineMode): void { }

    public onExit(toMode: MachineMode): void { }

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

    // this should honor max stack size of the output item
    private computeRemainingCrafts(): void {
        const machine = this.state.machine;

        const max_item_stack_size = machine.output.ingredient.item.stack_size

        const recipe = machine.metadata.recipe;

        let remaining_crafts_from_inputs = Infinity;

        for (const ingredient of recipe.raw.ingredients) {
            const availableQuantity = this.inventory_state.getQuantity(ingredient.name);
            const requiredQuantity = recipe.inputsPerCraft.get(ingredient.name)!.amount;
            const possible_crafts_for_ingredient = availableQuantity / requiredQuantity;

            if (possible_crafts_for_ingredient < 1) {
                remaining_crafts_from_inputs = 0;
                break;
            }

            remaining_crafts_from_inputs = Math.min(remaining_crafts_from_inputs, possible_crafts_for_ingredient)
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

    private craftingLogic() {
        const crafts_possible = this.craftsPossibleThisTick()
        const progress = this.state.craftingProgress.progress + crafts_possible
        const crafts_whole = Math.floor(progress);
        const crafts_remainder = progress - crafts_whole;

        const amount_per_craft = this.state.machine.output.ingredient.amount;
        const output_name = this.state.machine.output.ingredient.name;
        const max_stack_size = this.state.machine.output.ingredient.item.stack_size;
        const current_output = this.inventory_state.getQuantity(output_name);

        // Calculate potential craft output
        const craft_output = Math.floor(amount_per_craft * crafts_whole);

        // Calculate potential bonus output
        const bonus_per_craft = this.state.machine.bonus_productivity_rate.bonus_per_craft
        const bonus_crafts_possible = crafts_possible * bonus_per_craft
        const bonus_progress = this.state.bonusProgress.progress + bonus_crafts_possible
        const bonus_crafts_whole = Math.floor(bonus_progress);
        const bonus_craft_output = Math.floor(amount_per_craft * bonus_crafts_whole);

        // Total output that would be produced
        const total_output = craft_output + bonus_craft_output;
        const available_space = max_stack_size - current_output;

        // If total output exceeds available space, we need to adjust
        if (total_output > available_space) {
            // Calculate how much we can actually produce
            const actual_craft_output = Math.min(craft_output, available_space);
            const remaining_space = available_space - actual_craft_output;
            const actual_bonus_output = Math.min(bonus_craft_output, remaining_space);

            // Calculate the actual crafts that can complete based on output space
            const actual_crafts_whole = Math.floor(actual_craft_output / amount_per_craft);
            const actual_bonus_crafts_whole = Math.floor(actual_bonus_output / amount_per_craft);

            // Update progress based on what we can actually complete
            this.state.craftingProgress.progress = crafts_remainder;
            this.state.bonusProgress.progress = this.state.bonusProgress.progress + (actual_bonus_crafts_whole * amount_per_craft) / amount_per_craft;

            // Add the clamped outputs
            this.inventory_state.addQuantity(output_name, actual_craft_output);
            this.state.totalCrafted += actual_craft_output;

            this.inventory_state.addQuantity(output_name, actual_bonus_output);
            this.state.totalCrafted += actual_bonus_output;

            // Consume inputs
            if (actual_crafts_whole >= 1) {
                this.state.craftCount += actual_crafts_whole;
                this.consumeInputsForCraftCount(actual_crafts_whole);
            }
        } else {
            // Normal flow - everything fits
            this.state.craftingProgress.progress = crafts_remainder;

            const bonus_crafts_remainder = bonus_progress - bonus_crafts_whole;
            this.state.bonusProgress.progress = bonus_crafts_remainder;

            this.inventory_state.addQuantity(output_name, craft_output);
            this.state.totalCrafted += craft_output;

            this.inventory_state.addQuantity(output_name, bonus_craft_output);
            this.state.totalCrafted += bonus_craft_output;

            // conume inputs
            if (crafts_whole >= 1) {
                this.state.craftCount += crafts_whole;
                this.consumeInputsForCraftCount(crafts_whole);
            }
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