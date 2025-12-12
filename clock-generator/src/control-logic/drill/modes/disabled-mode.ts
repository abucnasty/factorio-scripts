import { DrillStatus } from "../../../state";
import { DrillMode } from "./drill-mode";

export class DrillDisabledMode implements DrillMode {

    public readonly status = DrillStatus.DISABLED
  
    public onEnter(fromMode: DrillMode): void { }
    public onExit(toMode: DrillMode): void { }

    public executeForTick(): void { }
}