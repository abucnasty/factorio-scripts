import { MachineState, MachineStatus } from "../../../state";
import { ModePlugin, Transition } from "../../mode";
import { MachineMode, MachineWorkingMode } from "../modes";

export type CraftEventListener = (craftIndex: number, state: MachineState) => void;

export class CraftEventListenerPlugin implements ModePlugin<MachineMode> {
    constructor(
        private readonly machine_state: MachineState,
        private readonly onCraftEvent: CraftEventListener,
    ) { }

    private craft_index = 0;

    onTransition(fromMode: MachineMode, transition: Transition<MachineMode>): void {}

    executeForTick(): void {
        if (this.machine_state.craftCount > this.craft_index) {
            this.onCraftEvent(this.machine_state.craftCount - 1, this.machine_state);
            this.craft_index = this.machine_state.craftCount;
        }
    }
}