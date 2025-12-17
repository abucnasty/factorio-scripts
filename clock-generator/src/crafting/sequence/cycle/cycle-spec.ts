import { Duration } from "../../../data-types";
import { EntityTransferCountMap } from "./swing-counts";

export interface CycleSpec {
    cycle_duration: Duration;
    swing_counts: EntityTransferCountMap;
}