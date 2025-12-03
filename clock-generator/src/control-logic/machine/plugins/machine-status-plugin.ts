import { MachineState } from "../../../state";
import { ModePlugin, Transition } from "../../mode";
import { MachineMode } from "../modes";

export class MachineStatusPlugin implements ModePlugin<MachineMode> {

    constructor(
        private readonly machine_state: MachineState
    ) {}

    onTransition(fromMode: MachineMode, transition: Transition<MachineMode>): void {
        this.machine_state.status = transition.toMode.status;
    }
}