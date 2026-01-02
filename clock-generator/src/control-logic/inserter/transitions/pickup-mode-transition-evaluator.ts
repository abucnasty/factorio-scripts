import { EntityState, InserterState, MachineState } from "../../../state";
import { EnableControl } from "../../enable-control";
import { ModeTransition, ModeTransitionEvaluator } from "../../mode";
import { InserterIdleMode, InserterMode } from "../modes";
import { InserterDisabledMode } from "../modes/disabled-mode";
import { InserterSwingMode } from "../modes/swing-mode";

export class PickupModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {

    constructor(
        private readonly inserterState: InserterState,
        private readonly sinkEntityState: EntityState,
        private readonly swing_mode: InserterSwingMode,
        private readonly disabled_mode: InserterDisabledMode,
        private readonly idle_mode: InserterIdleMode,
        private readonly enable_control: EnableControl,
    ) { }

    public onEnter(fromMode: InserterMode): void { }

    public onExit(toMode: InserterMode): void { }

    public evaluateTransition(): ModeTransition<InserterMode> {

        if (this.heldItemQuantity() === this.inserterState.inserter.metadata.stack_size) {
            return ModeTransition.transition(this.swing_mode, `Picked up full stack of ${this.heldItemName()}`);
        }

        const maybe_machine = this.sinkEntityState

        if (EntityState.isMachine(maybe_machine) && this.heldItemName() != "nothing") {
            if (MachineState.machineInputIsBlocked(maybe_machine, this.heldItemName())) {
                return ModeTransition.transition(this.idle_mode, `Inserter is disabled due to sink item ${this.heldItemName()} being input blocked`)
            }
        }

        if (!this.enable_control.isEnabled()) {
            return ModeTransition.transition(this.disabled_mode, `Inserter disabled while picking up ${this.heldItemName()} (${this.heldItemQuantity()})`);
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