import { InserterStatus } from "../../../state";
import { InserterMode } from "./inserter-mode";

export class InserterIdleMode implements InserterMode {
    public readonly status = InserterStatus.IDLE;

    public onEnter(fromMode: InserterMode): void {
        // No action needed on enter
    }

    public onExit(toMode: InserterMode): void {
        // No action needed on exit
    }

    public executeForTick(): void {
        // Idle mode does nothing each tick
    }
}