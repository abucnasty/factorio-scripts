import { describe, it, expect, beforeAll } from "vitest";
import { generateClockForConfig, BlueprintGenerationResult } from "./generate-blueprint";
import { loadConfigFromFile } from "../config/loader";
import { ConfigPaths } from "../config/config-paths";
import { EntityId } from "../entities";
import { OpenRange } from "../data-types";

describe("generateClockForConfig", () => {

    describe("STONE_BRICKS_DIRECT_INSERT config", async () => {

        const config = await loadConfigFromFile(ConfigPaths.STONE_BRICKS_DIRECT_INSERT);
        const result: BlueprintGenerationResult = generateClockForConfig(config);

        // Get the actual EntityId instances from the map keys
        const keys = Array.from(result.crafting_cycle_plan.entity_transfer_map.keys());
        const inserterId: EntityId = keys.find(k => k.id === "inserter:1")!;
        const drillId: EntityId = keys.find(k => k.id === "drill:1")!;

        it("generates a blueprint", () => {
            expect(result.blueprint).toBeDefined();
        });

        it("has a crafting cycle plan", () => {
            expect(result.crafting_cycle_plan).toBeDefined();
        });

        it("has a simulation duration", () => {
            expect(result.simulation_duration).toBeDefined();
            expect(result.simulation_duration.ticks).toBeGreaterThan(0);
        });

        describe("output inserter transfer ranges", () => {
            it("transfer counts equal to 6 for the output inserter (inserter:1)", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(inserterId);

                expect(transferCounts.total_transfer_count.toDecimal()).toBe(6);
            });

            it("has stone-brick as the transferred item for the output inserter", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(inserterId);

                expect(transferCounts.item_transfers.length).toBe(1);
                expect(transferCounts.item_transfers[0].item_name).toBe("stone-brick");
            });

            it("has 6 transfers for the output inserter", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(inserterId);

                expect(transferCounts.item_transfers.length).toBe(1);
                expect(transferCounts.item_transfers[0].transfer_count.toDecimal()).toBe(6);
            });

            it("has the correct stack size for the output inserter", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(inserterId);

                expect(transferCounts.stack_size).toBe(16);
            });
        });

        describe("drill transfer ranges", () => {
            it("has transfer counts for the drill (drill:1)", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(drillId);

                expect(transferCounts.total_transfer_count.toDecimal()).toBeGreaterThan(0);
            });

            it("has stone as the transferred item for the drill", () => {
                const transferCounts = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(drillId);

                expect(transferCounts.item_transfers.length).toBe(1);
                expect(transferCounts.item_transfers[0].item_name).toBe("stone");
            });
        });

        describe("crafting cycle plan properties", () => {
            it("total duration is 144 ticks", () => {
                expect(result.crafting_cycle_plan.total_duration.ticks).toBe(144);
            });

            it("has stone-brick as the production rate item", () => {
                expect(result.crafting_cycle_plan.production_rate.machine_production_rate.item).toBe("stone-brick");
            });
        });

        describe("transfer history", () => {
            it("contains transfer history entries", () => {
                expect(result.transfer_history.size).toBeGreaterThan(0);
            });

            it("contains entries for the output inserter", () => {
                const inserterTransfers = result.transfer_history.getOrThrow(inserterId);
                expect(inserterTransfers.length).toBeGreaterThan(0);
            });

            it("contains entries for the drill", () => {
                const drillTransfers = result.transfer_history.getOrThrow(drillId);
                expect(drillTransfers.length).toBeGreaterThan(0);
            });

            it("has correct tick ranges for inserter transfers", () => {
                const inserterTransfers = result.transfer_history.getOrThrow(inserterId);
                const expected_start_inclusive = 1
                // the output inserter swings 6 times, so the end range can be anywhere between 61 and 71
                // if 72 or more, the inserter will cause instability due to swinging a 7th time
                const expected_end_inclusive = OpenRange.from(61, 71);
                
                expect(inserterTransfers.length).toBe(1);
                const transfer = inserterTransfers[0];
                expect(transfer.tick_range.start_inclusive).toBe(expected_start_inclusive);
                expect(transfer.tick_range.end_inclusive).toBeGreaterThanOrEqual(expected_end_inclusive.start_inclusive);
                expect(transfer.tick_range.end_inclusive).toBeLessThanOrEqual(expected_end_inclusive.end_inclusive);
            });

        });
    });

    describe("LOGISTIC_SCIENCE_SHARED_INSERTER config", async () => {

        const config = await loadConfigFromFile(ConfigPaths.LOGISTIC_SCIENCE_SHARED_INSERTER);
        const result: BlueprintGenerationResult = generateClockForConfig(config);

        // Get the actual EntityId instances from the map keys
        const keys = Array.from(result.crafting_cycle_plan.entity_transfer_map.keys());
        const input_inserter_id: EntityId = keys.find(k => k.id === EntityId.forInserter(1).id)!;
        const output_inserter_id: EntityId = keys.find(k => k.id === EntityId.forInserter(2).id)!;


        describe("transfer history", () => {
            it("contains transfer history entries", () => {
                expect(result.transfer_history.size).toBeGreaterThan(0);
            });

            it("contains entries for the input inserter", () => {
                const inserterTransfers = result.transfer_history.getOrThrow(input_inserter_id);
                expect(inserterTransfers.length).toBeGreaterThan(0);
            });

            it("contains entries for the output inserter", () => {
                const inserterTransfers = result.transfer_history.getOrThrow(output_inserter_id);
                expect(inserterTransfers.length).toBeGreaterThan(0);
            });

            it("has correct tick ranges for output inserter transfers", () => {
                const inserterTransfers = result.transfer_history.getOrThrow(output_inserter_id);
                const expected_start_inclusive = 1
                // the output inserter swings 6 times, so the end range can be anywhere between 61 and 71
                // if 72 or more, the inserter will cause instability due to swinging a 7th time
                const expected_end_inclusive = 50
                
                expect(inserterTransfers.length).toBe(1);
                const transfer = inserterTransfers[0];
                expect(transfer.tick_range.start_inclusive).toBe(expected_start_inclusive);
                expect(transfer.tick_range.end_inclusive).toBe(expected_end_inclusive);
            });

            it("has correct tick ranges for input inserter transfers", () => {
                const inserter_transfers = result.transfer_history.getOrThrow(input_inserter_id)
                const sorted_transfers = [...inserter_transfers].sort((a, b) => a.tick_range.start_inclusive - b.tick_range.start_inclusive);
                const expected_ranges = [
                    OpenRange.from(51, 62),
                    OpenRange.from(62, 73),
                    OpenRange.from(80, 91),
                    OpenRange.from(91, 102)
                ]
                
                expect(sorted_transfers.length).toBe(4);
                sorted_transfers.forEach((transfer, index) => {
                    const expected_range = expected_ranges[index];
                    expect(transfer.tick_range.start_inclusive).toBe(expected_range.start_inclusive);
                    expect(transfer.tick_range.end_inclusive).toBe(expected_range.end_inclusive);
                })
            });

        });
        
    });

    describe("CHEMICAL_SCIENCE_ENGINES config (multi-output machine)", async () => {

        const config = await loadConfigFromFile(ConfigPaths.CHEMICAL_SCIENCE_ENGINES);
        const result: BlueprintGenerationResult = generateClockForConfig(config);

        // Get the actual EntityId instances from the map keys
        const keys = Array.from(result.crafting_cycle_plan.entity_transfer_map.keys());
        const output_inserter_1_id: EntityId = keys.find(k => k.id === EntityId.forInserter(1).id)!;
        const output_inserter_2_id: EntityId = keys.find(k => k.id === EntityId.forInserter(2).id)!;

        describe("crafting cycle plan properties", () => {
            it("has engine-unit as the production rate item", () => {
                expect(result.crafting_cycle_plan.production_rate.machine_production_rate.item).toBe("engine-unit");
            });

            it("total duration is 160 ticks (80 ticks per swing × 2 swings)", () => {
                // With 2 output machines and target rate of 24 items/sec,
                // each machine produces at 0.2 items/tick (24/60/2).
                // A stack of 16 items takes 80 ticks per machine.
                // With 2 swings per cycle, total duration = 160 ticks.
                expect(result.crafting_cycle_plan.total_duration.ticks).toBe(160);
            });

            it("has 2 transfers for each output inserter", () => {
                const transferCounts1 = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(output_inserter_1_id);
                const transferCounts2 = result.crafting_cycle_plan.entity_transfer_map.getOrThrow(output_inserter_2_id);

                expect(transferCounts1.total_transfer_count.toDecimal()).toBe(2);
                expect(transferCounts2.total_transfer_count.toDecimal()).toBe(2);
            });
        });

        describe("copies parameter equivalence", () => {
            it("doubling target rate with copies=2 produces same cycle duration", async () => {
                // Load the config and modify it to double the rate with 2 copies
                const modifiedConfig = { ...config };
                modifiedConfig.target_output = {
                    ...config.target_output,
                    items_per_second: config.target_output.items_per_second * 2,
                    copies: 2
                };

                const modifiedResult = generateClockForConfig(modifiedConfig);

                // The cycle duration should be the same because:
                // - Original: 24 items/sec, 1 copy → per-machine rate = 24/60/2 = 0.2 items/tick
                // - Modified: 48 items/sec, 2 copies → per-machine rate = 48/60/2/2 = 0.2 items/tick
                expect(modifiedResult.crafting_cycle_plan.total_duration.ticks)
                    .toBe(result.crafting_cycle_plan.total_duration.ticks);
            });
        });
    });
    describe("config validation", () => {
        it("throw error if the current configuration cannot meet the target production rate", async () => {
            const config = await loadConfigFromFile(ConfigPaths.STONE_BRICKS_DIRECT_INSERT);
            expect(config.target_output.items_per_second).toBe(120)
            expect(() => generateClockForConfig(config)).not.toThrowError();
            config.target_output.items_per_second = 240;
            expect(() => generateClockForConfig(config)).toThrowError();
        })
    })

    describe("fractional swings", () => {
        describe("PRODUCTION_SCIENCE_SHARED with fractional swings enabled", async () => {
            const configWithFractionalSwings = await loadConfigFromFile(ConfigPaths.PRODUCTION_SCIENCE_SHARED_JSON);
            
            const result = generateClockForConfig(configWithFractionalSwings);

            it("has fractional_swings_enabled set to true", () => {
                expect(result.crafting_cycle_plan.fractional_swings_enabled).toBe(true);
            });

            it("has a cycle_multiplier defined", () => {
                expect(result.crafting_cycle_plan.cycle_multiplier).toBeDefined();
                expect(result.crafting_cycle_plan.cycle_multiplier).toBeGreaterThan(1);
            });

            it("has swing_distribution defined", () => {
                expect(result.crafting_cycle_plan.swing_distribution).toBeDefined();
                expect(result.crafting_cycle_plan.swing_distribution!.size).toBeGreaterThan(0);
            });

            it("swing distributions sum to correct totals", () => {
                const distribution = result.crafting_cycle_plan.swing_distribution!;
                const cycle_multiplier = result.crafting_cycle_plan.cycle_multiplier!;
                
                for (const [entityId, swingDist] of distribution.entries()) {
                    const sum = swingDist.swings_per_subcycle.reduce((a, b) => a + b, 0);
                    expect(sum).toBe(swingDist.total_swings);
                    expect(swingDist.swings_per_subcycle.length).toBe(cycle_multiplier);
                }
            });

            it("output inserter has fractional swing distribution", () => {
                const distribution = result.crafting_cycle_plan.swing_distribution!;
                const outputInserterDist = distribution.get("inserter:1");
                
                expect(outputInserterDist).toBeDefined();
                // Should have alternating distribution (values differ by at most 1)
                const swings = outputInserterDist!.swings_per_subcycle;
                const min = Math.min(...swings);
                const max = Math.max(...swings);
                expect(max - min).toBeLessThanOrEqual(1);
            });

            it("simulation duration is extended by cycle_multiplier", () => {
                const base_duration = result.crafting_cycle_plan.total_duration.ticks;
                const cycle_multiplier = result.crafting_cycle_plan.cycle_multiplier!;
                const expected_simulation_duration = base_duration * cycle_multiplier;
                
                expect(result.simulation_duration.ticks).toBe(expected_simulation_duration);
            });
        });

        describe("PRODUCTION_SCIENCE_SHARED without fractional swings without fractional swings", async () => {
            const config = await loadConfigFromFile(ConfigPaths.PRODUCTION_SCIENCE_SHARED_JSON);
            const configWithoutFractionalSwings = {
                ...config,
                overrides: {
                    ...config.overrides,
                    use_fractional_swings: false
                }
            };
            const result = generateClockForConfig(configWithoutFractionalSwings);

            it("has fractional_swings_enabled set to false", () => {
                expect(result.crafting_cycle_plan.fractional_swings_enabled).toBe(false);
            });

            it("does not have swing_distribution defined", () => {
                expect(result.crafting_cycle_plan.swing_distribution).toBeUndefined();
            });

            it("does not have cycle_multiplier defined", () => {
                expect(result.crafting_cycle_plan.cycle_multiplier).toBeUndefined();
            });
        });
    });
});
