import { ControlLogic } from "../control-logic";

export interface InserterStateControlLogic extends ControlLogic {
    onEnter(): void;
    onExit(): void;
}