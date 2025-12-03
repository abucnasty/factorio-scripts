import { MachineStatus } from "../../../state";
import { MachineMode } from "./machine-mode";

export class MachineOutputFullMode implements MachineMode {
    public readonly status = MachineStatus.OUTPUT_FULL;

    public onEnter(fromMode: MachineMode): void {}

    public onExit(toMode: MachineMode): void {}

    public executeForTick(): void {}
}