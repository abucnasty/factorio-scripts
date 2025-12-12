import { EnableControl } from "../../enable-control";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { DrillDisabledMode } from "../modes/disabled-mode";
import { DrillMode } from "../modes/drill-mode";

export class DrillWorkingModeTransitionEvaluator implements ModeTransitionEvaluator<DrillMode> {
    constructor(
        private enable_control: EnableControl,
        private readonly disabled_mode: DrillDisabledMode,
    ) { }

    public onEnter(fromMode: DrillMode): void {}

    public onExit(toMode: DrillMode): void {}

    public evaluateTransition(): ModeTransition<DrillMode> {
        if (!this.enable_control.isEnabled()) { 
            return ModeTransition.transition(this.disabled_mode, "drill disabled");
        }
        return ModeTransition.NONE;
    }
}