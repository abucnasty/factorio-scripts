import Fraction, { fraction } from "fractionability";

export class ProgressState {

    public static clone(progressState: ProgressState): ProgressState {
        return new ProgressState(progressState.progress);
    }

    constructor(
        public progress: Fraction = fraction(0)
    ) { }

    public clone(): ProgressState {
        return ProgressState.clone(this);
    }
}