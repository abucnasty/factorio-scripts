import { InserterStatus } from "../../../state/inserter-state";
import { InserterMode } from "./inserter-mode";

export class InserterSwingMode implements InserterMode {

    public readonly status = InserterStatus.SWING;

    constructor() { }

    public onEnter(fromMode: InserterMode): void { }

    public onExit(toMode: InserterMode): void { }

    public executeForTick(): void { }
}