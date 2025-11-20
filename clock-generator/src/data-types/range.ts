export class OpenRange {

    public static from(start:number, end: number): OpenRange {
        return new OpenRange(start, end);
    }

    constructor(
        public readonly start_inclusive: number,
        public readonly end_inclusive: number,
    ) {}

    public duration(): number {
        return this.end_inclusive - this.start_inclusive;
    }
}