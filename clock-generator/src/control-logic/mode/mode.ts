import { ControlLogic } from "../control-logic";

export interface ModeOnEnterHook<M extends Mode> {
    onEnter(fromMode: M): void;
}

export interface ModeOnExitHook<M extends Mode> {
    onExit(toMode: M): void;
}

export interface Mode extends ControlLogic, ModeOnEnterHook<Mode>, ModeOnExitHook<Mode> {}