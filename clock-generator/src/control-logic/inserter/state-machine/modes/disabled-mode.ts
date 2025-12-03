import { InserterStatus } from "../../../../state";
import { InserterMode } from "./inserter-mode";

export class InserterDisabledMode implements InserterMode {
    public readonly status = InserterStatus.DISABLED;

    public onEnter(fromMode: InserterMode): void {}

    public onExit(toMode: InserterMode): void {}

    public executeForTick(): void {}
}