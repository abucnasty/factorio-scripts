import { ItemName } from "../../../data/factorio-data-types";
import { MachineState } from "../../../state";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { MachineMode, MachineWorkingMode } from "../modes";

export class IngredientShortageModeTransitionEvaluator implements ModeTransitionEvaluator<MachineMode> {
    
    constructor(
        private readonly machine_state: MachineState,
        private readonly working_mode: MachineWorkingMode,
    ) {}

    public onEnter(fromMode: MachineMode): void {}

    public onExit(toMode: MachineMode): void {}

    public evaluateTransition(): ModeTransition<MachineMode> {
        if (this.working_mode.hasEnoughInputsForCraft()) {
            return ModeTransition.transition(this.working_mode, 'machine has enough inputs for craft');
        }
        return ModeTransition.NONE;
    }
}