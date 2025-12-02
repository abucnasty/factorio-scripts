import { ControlLogic } from "./control-logic";

export class CompositeControlLogic implements ControlLogic {

    constructor(
        private readonly controlLogics: ControlLogic[],
    ) { }

    public executeForTick(): void {
        for (const controlLogic of this.controlLogics) {
            controlLogic.executeForTick();
        }
    }
}