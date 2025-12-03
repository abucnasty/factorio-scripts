import { InserterStatus } from "../../../state";
import { EnableControl } from "../../enable-control";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { InserterMode } from "../modes/inserter-mode";

export class DisabledModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {
    constructor(
        private enable_control: EnableControl,
        private readonly idle_mode: InserterMode,
    ) { }

    public onEnter(fromMode: InserterMode): void {}

    public onExit(toMode: InserterMode): void {}

    public evaluateTransition(): ModeTransition<InserterMode> {
        if (this.enable_control.isEnabled()) { 
            return ModeTransition.transition(this.idle_mode!, "inserter enabled");
        }
        return ModeTransition.NONE;
    }
}