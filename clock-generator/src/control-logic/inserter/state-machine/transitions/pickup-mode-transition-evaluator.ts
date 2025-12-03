import { InserterState } from "../../../../state";
import { ModeTransition, ModeTransitionEvaluator } from "../../../mode";
import { InserterMode } from "../modes";
import { InserterSwingMode } from "../modes/swing-mode";

export class PickupModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {

    constructor(
        private readonly inserterState: InserterState,
        private readonly swing_mode: InserterSwingMode
    ) {}

    public onEnter(fromMode: InserterMode): void {}

    public onExit(toMode: InserterMode): void {}

    public evaluateTransition(): ModeTransition<InserterMode>{
        if (this.heldItemQuantity() === this.inserterState.inserter.metadata.stack_size) {
            return ModeTransition.transition(this.swing_mode, `Picked up full stack of ${this.heldItemName()}`);
        }

        return ModeTransition.NONE;
    }

    private heldItemQuantity(): number {
        return this.inserterState.held_item?.quantity ?? 0
    }

    private heldItemName(): string {
        return this.inserterState.held_item?.item_name ?? "nothing"
    }
}