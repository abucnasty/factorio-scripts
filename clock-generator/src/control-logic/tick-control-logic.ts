import { ControlLogic } from "./control-logic";
import { MutableTickProvider } from "./current-tick-provider";

export class TickControlLogic implements ControlLogic {

    constructor(
        private readonly mutableTickProvider: MutableTickProvider,
    ) { }

    public executeForTick(): void {
        this.mutableTickProvider.incrementTick();
    }
}