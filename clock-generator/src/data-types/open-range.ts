import { Duration } from "./duration";

export class OpenRange {

    public static from(start:number, end: number): OpenRange {
        return new OpenRange(start, end);
    }

    public static fromStartAndDuration(start: number, duration: number): OpenRange {
        return new OpenRange(start, start + duration - 1);
    }

    public static reduceRanges(ranges: OpenRange[]): OpenRange[] {
        if (ranges.length === 0) {
            return [];
        }

        const sorted_ranges = ranges.slice().sort((a, b) => a.start_inclusive - b.start_inclusive);
        const reduced_ranges: OpenRange[] = [];
        let current_range = sorted_ranges[0];
        for (let i = 1; i < sorted_ranges.length; i++) {
            const next_range = sorted_ranges[i];
            if (current_range.end_inclusive + 1 >= next_range.start_inclusive) {
                // overlapping or contiguous ranges, merge them
                current_range = new OpenRange(
                    current_range.start_inclusive,
                    Math.max(current_range.end_inclusive, next_range.end_inclusive)
                );
            } else {
                // no overlap, push the current range and move to the next
                reduced_ranges.push(current_range);
                current_range = next_range;
            }
        }
        // push the last range
        reduced_ranges.push(current_range);
        return reduced_ranges;
    }

    public static merge(ranges: OpenRange[]): OpenRange {
        if (ranges.length === 0) {
            throw new Error("Cannot merge empty range list");
        }
        const start = Math.min(...ranges.map(r => r.start_inclusive));
        const end = Math.max(...ranges.map(r => r.end_inclusive));
        return new OpenRange(start, end);
    }

    constructor(
        public readonly start_inclusive: number,
        public readonly end_inclusive: number,
    ) {}

    public duration(): Duration {
        return Duration.ofTicks(this.end_inclusive - this.start_inclusive);
    }

    public contains(value: number): boolean {
        return value >= this.start_inclusive && value <= this.end_inclusive;
    }

    public overlaps(other: OpenRange): boolean {
        return this.start_inclusive <= other.end_inclusive && other.start_inclusive <= this.end_inclusive;
    }
}