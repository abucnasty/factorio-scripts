import { InserterStatus } from "../../../state";
import { EnableControl } from "../../enable-control";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { InserterMode } from "../modes/inserter-mode";

export class DisabledModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {
    constructor(
        private enable_control: EnableControl,
        private readonly idle_mode: InserterMode,
    ) { }

    private previous_mode: InserterMode | null = null;

    public onEnter(fromMode: InserterMode): void {
        this.previous_mode = fromMode;
    }

    public onExit(toMode: InserterMode): void {}

    public evaluateTransition(): ModeTransition<InserterMode> {
        if (this.enable_control.isEnabled()) { 
            return ModeTransition.transition(this.previous_mode!, "inserter enabled");
        }
        return ModeTransition.NONE;
    }
}