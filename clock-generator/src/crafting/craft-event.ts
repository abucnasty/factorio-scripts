import { OpenRange } from "../data-types/range";
import { MachineState } from "../state/machine-state";

export interface CraftEvent {
    readonly machine_state: Readonly<MachineState>;
    readonly tick_range: OpenRange;
    readonly craft_index: number;
}