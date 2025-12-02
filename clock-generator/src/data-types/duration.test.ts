import { describe, test, expect } from "vitest"

import { Duration } from "./duration";

describe("Duration", () => {
    test("creates duration from ticks", () => {
        const duration = Duration.ofTicks(120);
        expect(duration.ticks).toBe(120);
        expect(duration.seconds).toBe(2);
    })

    test("creates duration from seconds", () => {
        const duration = Duration.ofSeconds(3);
        expect(duration.seconds).toBe(3);
        expect(duration.ticks).toBe(180);
    })
})