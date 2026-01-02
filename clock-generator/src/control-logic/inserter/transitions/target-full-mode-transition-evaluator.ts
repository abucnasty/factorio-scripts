import { InserterState } from "../../../state";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { InserterMode } from "../modes";
import { InserterSwingMode } from "../modes/swing-mode";

/**
 * Transition evaluator for the TARGET_FULL mode.
 * 
 * The inserter is in this mode when it's waiting because its sink (chest) is full
 * and it still has items in hand. It will transition to swing mode when all items
 * have been dropped (held_item === null).
 */
export class TargetFullModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {

    constructor(
        private readonly inserter_state: InserterState,
        private readonly swing_mode: InserterSwingMode
    ) { }

    public onEnter(fromMode: InserterMode): void { }

    public onExit(toMode: InserterMode): void { }

    public evaluateTransition(): ModeTransition<InserterMode> {
        // Transition to swing mode when all items have been dropped
        if (this.inserter_state.held_item === null) {
            return ModeTransition.transition(this.swing_mode, "all items dropped to chest");
        }
        return ModeTransition.NONE;
    }
}
