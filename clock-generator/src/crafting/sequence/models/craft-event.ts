import { OpenRange } from "../../../data-types";
import { MachineState } from "../../../state";

export interface CraftEvent {
    machine_state: Readonly<MachineState>;
    tick_range: OpenRange;
    craft_index: number;
}
