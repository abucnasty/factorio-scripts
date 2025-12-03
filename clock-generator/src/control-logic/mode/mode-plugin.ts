import { ControlLogic } from "../control-logic";
import { Mode } from "./mode";
import { Transition } from "./mode-transition";

export interface ModePlugin<M extends Mode> extends Partial<ControlLogic> {
    onTransition(fromMode: M, transition: Transition<M>): void
}