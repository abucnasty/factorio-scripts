import { MachineState } from "../../../state";
import { ModeTransitionEvaluator, ModeTransition } from "../../mode";
import { MachineMode, MachineWorkingMode } from "../modes";

export class OutputFullModeTransitionEvaluator implements ModeTransitionEvaluator<MachineMode> {
    
    constructor(
        private readonly machine_state: MachineState,
        private readonly working_mode: MachineWorkingMode,
    ) {}

    public onEnter(fromMode: MachineMode): void {}

    public onExit(toMode: MachineMode): void {}

    public evaluateTransition(): ModeTransition<MachineMode> {
        if (!this.working_mode.hasEnoughInputsForCraft()) {
            return ModeTransition.NONE
        }

        const current_output = this.working_mode.output_item;
        const output_block = this.machine_state.machine.output.outputBlock


        const number_of_inputs = this.machine_state.machine.inputs.size;

        if (number_of_inputs === 0) { // fluid only recipes
            if (current_output.quantity < output_block.max_stack_size) {
                return ModeTransition.transition(this.working_mode, `machine has dropped under max stack size of ${output_block.max_stack_size} ${current_output.item_name}`);
            }
        }

        if (current_output.quantity < output_block.quantity) {
            return ModeTransition.transition(this.working_mode, `output "${current_output.item_name}" ${current_output.quantity} < ${output_block.quantity}`);
        }
        return ModeTransition.NONE;
    }
}