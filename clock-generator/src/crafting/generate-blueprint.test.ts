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
        
    })
});
