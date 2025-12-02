import { describe, test, expect } from "vitest"
import { OpenRange } from "./open-range";

describe("OpenRange", () => {
    test("creates range from start and end", () => {
        const range = OpenRange.from(5, 10);
        expect(range.start_inclusive).toBe(5);
        expect(range.end_inclusive).toBe(10);
    })

    test("creates range from start and duration", () => {
        const range = OpenRange.fromStartAndDuration(5, 6);
        expect(range.start_inclusive).toBe(5);
        expect(range.end_inclusive).toBe(10);
    })

    test("calculates duration", () => {
        const range = OpenRange.from(3, 8);
        const duration = range.duration();
        expect(duration.ticks).toBe(5);
    })

    test("checks if value is contained in range", () => {
        const range = OpenRange.from(10, 20);
        expect(range.contains(10)).toBe(true);
        expect(range.contains(15)).toBe(true);
        expect(range.contains(20)).toBe(true);
        expect(range.contains(9)).toBe(false);
        expect(range.contains(21)).toBe(false);
    })

    describe("::reduceRanges", () => {

        test("reduces overlapping ranges", () => {
            const ranges = [
                OpenRange.from(1, 5),
                OpenRange.from(4, 10),
            ];
            const result = OpenRange.reduceRanges(ranges);
            expect(result.length).toBe(1);
            const first_result = result[0];
            expect(first_result.start_inclusive).toBe(1);
            expect(first_result.end_inclusive).toBe(10);
        })

        test("reduces contiguous ranges", () => {
            const ranges = [
                OpenRange.from(1, 5),
                OpenRange.from(5, 10),
            ];
            const result = OpenRange.reduceRanges(ranges);
            expect(result.length).toBe(1);
            const first_result = result[0];
            expect(first_result.start_inclusive).toBe(1);
            expect(first_result.end_inclusive).toBe(10);
        })

        test("does not merge ranges with gaps", () => {
            const ranges = [
                OpenRange.from(1, 5),
                OpenRange.from(7, 10),
            ];
            const result = OpenRange.reduceRanges(ranges);
            expect(result.length).toBe(2);

            const first_result = result[0];
            expect(first_result.start_inclusive).toBe(1);
            expect(first_result.end_inclusive).toBe(5);

            const second_result = result[1];
            expect(second_result.start_inclusive).toBe(7);
            expect(second_result.end_inclusive).toBe(10);
        })
    })
});