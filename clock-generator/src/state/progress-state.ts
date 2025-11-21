import Fraction, { fraction } from "fractionability";


export interface ProgressState {
    progress: Fraction;
}

function clone(progressState: ProgressState): ProgressState {
    return { progress: progressState.progress };
}

function empty(): ProgressState {
    return {
        progress: fraction(0)
    }
}

export const ProgressState = {
    clone: clone,
    empty: empty
};