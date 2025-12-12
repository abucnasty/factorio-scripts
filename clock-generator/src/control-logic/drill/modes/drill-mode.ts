import { DrillStatus } from "../../../state";
import { Mode } from "../../mode";

export interface DrillMode extends Mode {
    status: DrillStatus
}