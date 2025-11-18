import Fraction, { fraction } from "fractionability";

export class ProgressState {
    constructor(
        public progress: Fraction = fraction(0),
        public completed_this_tick: boolean = false
    ) { }

    /**
     * returns true if progress reached or exceeded 1
     * @param amount 
     */
    public progressBy(amount: Fraction): void {
        this.progress = this.progress.add(amount);
        this.completed_this_tick = this.progress.toDecimal() >= 1;

        // if progress is greater than 1, subtract 1 from the progress
        if (this.progress.toDecimal() >= 1) {
            this.progress = this.progress.subtract(1);
        }
    }
}