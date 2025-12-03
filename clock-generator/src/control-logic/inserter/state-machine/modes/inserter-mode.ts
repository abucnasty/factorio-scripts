import { InserterStatus } from "../../../../state";
import { Mode } from "../../../mode";

export interface InserterMode extends Mode {
    readonly status: InserterStatus
}