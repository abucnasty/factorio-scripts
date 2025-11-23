import { Duration } from "./duration";

export class OpenRange {

    public static from(start:number, end: number): OpenRange {
        return new OpenRange(start, end);
    }

    public static fromStartAndDuration(start: number, duration: number): OpenRange {
        return new OpenRange(start, start + duration - 1);
    }

    constructor(
        public readonly start_inclusive: number,
        public readonly end_inclusive: number,
    ) {}

    public duration(): Duration {
        return Duration.ofTicks(this.end_inclusive - this.start_inclusive);
    }
}