import { Mode, ModeOnEnterHook, ModeOnExitHook } from "./mode";
import { ModeTransition } from "./mode-transition";

export interface ModeTransitionEvaluator<M extends Mode> extends ModeOnEnterHook<M>, ModeOnExitHook<M> {
    evaluateTransition(): ModeTransition<M>
}