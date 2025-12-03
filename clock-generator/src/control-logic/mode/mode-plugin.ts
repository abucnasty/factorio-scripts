import { Mode } from "./mode";
import { Transition } from "./mode-transition";

export interface ModePlugin<M extends Mode> {
    onTransition(fromMode: M, transition: Transition<M>): void
}