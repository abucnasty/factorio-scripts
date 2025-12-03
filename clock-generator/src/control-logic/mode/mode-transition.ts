import { Mode } from "./mode";

export type ModeTransition<M extends Mode = Mode> = Transition<M> | null;

const NoTransition: ModeTransition<any> = null;

export class Transition<M extends Mode> {
    constructor(
        public readonly toMode: M,
        public readonly reason: string,
    ) { }
}


function fold<M extends Mode>(transition: ModeTransition<M>, onNoTransition: () => M, onTransition: (transition: Transition<M>) => M): M {
    if (transition instanceof Transition) {
        return onTransition(transition);
    } else {
        return onNoTransition();
    }
}

function createTransition<M extends Mode>(toMode: M, reason: string): Transition<M> {
    return new Transition(toMode, reason);
}

export const ModeTransition = {
    fold: fold,
    NONE: NoTransition,
    transition: createTransition
}

