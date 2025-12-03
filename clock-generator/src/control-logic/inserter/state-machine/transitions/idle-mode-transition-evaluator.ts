import { EntityState, InserterState, MachineState } from "../../../../state";
import { ModeTransition, ModeTransitionEvaluator } from "../../../mode";
import { InserterMode } from "../modes/inserter-mode";
import { InserterPickupMode } from "../modes/pickup-mode";
import { EnableControl } from "../../../enable-control";
import { InserterDisabledMode } from "../modes/disabled-mode";

export class IdleModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {

    public static create(args: {
        inserter_state: InserterState,
        source_state: EntityState,
        sink_state: EntityState,
        pickup_mode: InserterPickupMode,
        disabled_mode: InserterDisabledMode,
        enable_control: EnableControl,
    }): IdleModeTransitionEvaluator {
        return new IdleModeTransitionEvaluator(
            args.inserter_state,
            args.source_state,
            args.sink_state,
            args.pickup_mode,
            args.disabled_mode,
            args.enable_control,
        );
    }

    private constructor(
        private readonly inserter_state: InserterState,
        private readonly source_state: EntityState,
        private readonly sink_state: EntityState,
        private readonly pickup_mode: InserterPickupMode,
        private readonly disabled_mode: InserterDisabledMode,
        private readonly enable_control: EnableControl,
    ) {}

    public onEnter(fromMode: InserterMode): void {}

    public onExit(toMode: InserterMode): void {}

    public evaluateTransition(): ModeTransition<InserterMode> {
        if (!this.enable_control.isEnabled()) {
            return ModeTransition.transition(this.disabled_mode, "inserter disabled");
        }

        if (!this.sinkAcceptsItems()) {
            return ModeTransition.NONE;
        }

        if (EntityState.isMachine(this.source_state)) {
            return this.machinePickupTransition(this.inserter_state, this.source_state);
        }

        if (EntityState.isBelt(this.source_state)) {
            return ModeTransition.transition(this.pickup_mode, "pickup from belt");
        }
        
        return null;
    }    

    private sinkAcceptsItems(): boolean {
        if (EntityState.isBelt(this.sink_state)) {
            return true;
        }

        if (EntityState.isMachine(this.sink_state)) {
            for (const item_name of this.inserter_state.inserter.filtered_items) {
                if(!MachineState.machineInputIsBlocked(this.sink_state, item_name)) {
                    return true
                }
            }
        }

        return false;
    }

    private machinePickupTransition(state: InserterState, source: MachineState): ModeTransition<InserterMode> {
        const pickup_amount_condition = 1;

        let items: Iterable<string> = state.inserter.filtered_items;

        if (state.held_item !== null) {
            items = [state.held_item.item_name];
        }

        for (const item_name of items) {
            const quantity = source.inventoryState.getQuantity(item_name);
            if (quantity >= pickup_amount_condition) {
                return ModeTransition.transition(this.pickup_mode, `machine has ${quantity} of ${item_name} to pickup`);
            }
        }
        return ModeTransition.NONE;
    }
}