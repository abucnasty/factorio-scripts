import { describe, it, expect } from 'vitest';
import {
    computeMaxSwingsPerSubCycle,
    createAlternatingDistribution,
    SwingCapacityConstraints
} from './swing-distribution';

describe('computeMaxSwingsPerSubCycle', () => {
    it('should return 100 (unlimited) when consumption rate matches insertion rate', () => {
        const constraints: SwingCapacityConstraints = {
            automated_insertion_limit: 32,
            consumption_rate_per_tick: 16 / 12, // 16 items per 12 ticks
            stack_size: 16,
            animation_total_ticks: 12
        };
        
        const result = computeMaxSwingsPerSubCycle(constraints);
        expect(result).toBe(100); // Unlimited because consumption >= stack_size per swing
    });

    it('should return limited swings when consumption is slower than insertion', () => {
        const constraints: SwingCapacityConstraints = {
            automated_insertion_limit: 32,
            consumption_rate_per_tick: 0.5, // Slow consumption
            stack_size: 16,
            animation_total_ticks: 12
        };
        
        const result = computeMaxSwingsPerSubCycle(constraints);
        // Items consumed per swing = 0.5 * 12 = 6
        // Net items per swing = 16 - 6 = 10
        // Peak after swing 1: 16 items
        // Peak after swing 2: 16 + 10 = 26 items (ok)
        // Peak after swing 3: 16 + 20 = 36 items (exceeds 32)
        // Max swings = 1 + floor((32 - 16) / 10) = 2
        expect(result).toBe(2);
    });

    it('should return 1 when insertion limit equals stack size', () => {
        const constraints: SwingCapacityConstraints = {
            automated_insertion_limit: 16,
            consumption_rate_per_tick: 0, // No consumption
            stack_size: 16,
            animation_total_ticks: 12
        };
        
        const result = computeMaxSwingsPerSubCycle(constraints);
        expect(result).toBe(1);
    });

    it('should handle case where insertion limit is less than stack size', () => {
        const constraints: SwingCapacityConstraints = {
            automated_insertion_limit: 8,
            consumption_rate_per_tick: 0,
            stack_size: 16,
            animation_total_ticks: 12
        };
        
        const result = computeMaxSwingsPerSubCycle(constraints);
        // floor(8 / 16) = 0, but we return at least 1
        expect(result).toBe(1);
    });

    it('should return 100 when consumption greatly exceeds stack size per animation', () => {
        const constraints: SwingCapacityConstraints = {
            automated_insertion_limit: 16,
            consumption_rate_per_tick: 5, // 5 items per tick
            stack_size: 16,
            animation_total_ticks: 12 // 60 items consumed per swing
        };
        
        const result = computeMaxSwingsPerSubCycle(constraints);
        expect(result).toBe(100);
    });
});

describe('createAlternatingDistribution', () => {
    it('should create [1, 2] distribution for 3/2 swings', () => {
        const result = createAlternatingDistribution(3, 2, 100);
        expect(result).toEqual([1, 2]);
    });

    it('should create [1, 1, 1] distribution for 3/3 swings', () => {
        const result = createAlternatingDistribution(3, 3, 100);
        expect(result).toEqual([1, 1, 1]);
    });

    it('should create [0, 1] distribution for 1/2 swings', () => {
        const result = createAlternatingDistribution(1, 2, 100);
        expect(result).toEqual([0, 1]);
    });

    it('should create [1, 1, 2] distribution for 4/3 swings', () => {
        const result = createAlternatingDistribution(4, 3, 100);
        // 4/3 = 1.33, so base=1, remainder=1
        // Alternating spreads extras starting at index 1: [1, 1, 2]
        expect(result).toEqual([1, 1, 2]);
    });

    it('should create [2, 3] distribution for 5/2 swings', () => {
        const result = createAlternatingDistribution(5, 2, 100);
        expect(result).toEqual([2, 3]);
    });

    it('should create even distribution when divisible', () => {
        const result = createAlternatingDistribution(6, 3, 100);
        expect(result).toEqual([2, 2, 2]);
    });

    it('should create [1, 2, 1, 2] for 6/4 swings (alternating pattern)', () => {
        const result = createAlternatingDistribution(6, 4, 100);
        // 6/4 = 1.5, so base=1, remainder=2
        // Should alternate: [1, 2, 1, 2]
        expect(result).toEqual([1, 2, 1, 2]);
    });

    it('should throw when max swings constraint is violated', () => {
        expect(() => {
            createAlternatingDistribution(5, 2, 2); // Needs [2, 3] but max is 2
        }).toThrow(/Cannot satisfy fractional swing constraint/);
    });

    it('should work when at exactly max swings', () => {
        const result = createAlternatingDistribution(4, 2, 2);
        expect(result).toEqual([2, 2]);
    });

    it('should throw for zero total swings', () => {
        expect(() => {
            createAlternatingDistribution(0, 2, 100);
        }).toThrow();
    });

    it('should throw for zero cycle multiplier', () => {
        expect(() => {
            createAlternatingDistribution(3, 0, 100);
        }).toThrow();
    });
});

describe('alternating distribution properties', () => {
    it('should always sum to total_swings', () => {
        for (let total = 1; total <= 10; total++) {
            for (let cycles = 1; cycles <= total; cycles++) {
                const result = createAlternatingDistribution(total, cycles, 100);
                const sum = result.reduce((a, b) => a + b, 0);
                expect(sum).toBe(total);
            }
        }
    });

    it('should have exactly cycle_multiplier elements', () => {
        for (let total = 1; total <= 10; total++) {
            for (let cycles = 1; cycles <= total; cycles++) {
                const result = createAlternatingDistribution(total, cycles, 100);
                expect(result.length).toBe(cycles);
            }
        }
    });

    it('should alternate between base and base+1 values', () => {
        for (let total = 1; total <= 10; total++) {
            for (let cycles = 1; cycles <= total; cycles++) {
                const result = createAlternatingDistribution(total, cycles, 100);
                const min = Math.min(...result);
                const max = Math.max(...result);
                expect(max - min).toBeLessThanOrEqual(1);
            }
        }
    });
});
