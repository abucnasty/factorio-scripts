import { describe, test, expect } from "vitest"
import { MiningProductivity } from "./mining-productivity"

describe("MiningProductivity", () => {
    test("creates from research level", () => {
        const level = 8000
        const mining_prod = MiningProductivity.fromLevel(level)
        expect(mining_prod.productivity.value).toBe(79990)
        expect(mining_prod.productivity.normalized).toBe(799.9)
    });
});