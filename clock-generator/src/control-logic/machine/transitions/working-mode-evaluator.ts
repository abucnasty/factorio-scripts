import { MachineState } from "../../../state";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { MachineIngredientShortageMode, MachineMode, MachineOutputFullMode, MachineWorkingMode } from "../modes";

export class WorkingModeTransitionEvaluator implements ModeTransitionEvaluator<MachineMode> {

    constructor(
        private readonly ingredient_shortage_mode: MachineIngredientShortageMode,
        private readonly output_full_mode: MachineOutputFullMode,
        private readonly working_mode: MachineWorkingMode,
        private readonly machine_state: MachineState,
    ) { }

    public onEnter(fromMode: MachineMode): void { }
    public onExit(toMode: MachineMode): void { }
    public evaluateTransition(): ModeTransition<MachineMode> {
        if (this.working_mode.hasEnoughInputsForCraft()) {
            return ModeTransition.NONE
        }

        const output_item = this.working_mode.output_item;
        const output_block = this.machine_state.machine.output.outputBlock

        if (output_item.quantity >= output_block.quantity) {
            return ModeTransition.transition(this.output_full_mode, `output item "${output_item.item_name}" = ${output_item.quantity} waiting to be removed`);
        }

        return ModeTransition.transition(this.ingredient_shortage_mode, "not enough inputs for craft");
    }
}