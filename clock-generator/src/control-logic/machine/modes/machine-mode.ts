import { MachineStatus } from "../../../state";
import { Mode } from "../../mode";

export interface MachineMode extends Mode {
    status: MachineStatus
}