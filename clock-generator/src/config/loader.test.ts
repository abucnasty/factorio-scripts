import { describe, it, expect } from "vitest";
import { parseConfig, parseConfigSafe } from "./loader";
import { ConfigValidationError } from "./errors";
import { BeltType } from "./config";
import { MiningDrillType } from "../entities";

describe("parseConfig", () => {
    describe("valid configurations", () => {
        it("should parse a minimal valid config", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1.5
                    copies = 2
                }
                machines = []
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.target_output.recipe).toBe("electronic-circuit");
            expect(config.target_output.items_per_second).toBe(1.5);
            expect(config.target_output.copies).toBe(2);
            expect(config.machines).toEqual([]);
            expect(config.inserters).toEqual([]);
            expect(config.belts).toEqual([]);
            expect(config.drills).toBeUndefined();
            expect(config.overrides).toBeUndefined();
            expect(config.chests).toBeUndefined();
        });

        it("should parse a config with machines", async () => {
            const hocon = `
                target_output {
                    recipe = "iron-gear-wheel"
                    items_per_second = 2.0
                    copies = 1
                }
                machines = [
                    {
                        id = 1
                        recipe = "iron-gear-wheel"
                        productivity = 0.5
                        crafting_speed = 1.25
                        type = "machine"
                    }
                ]
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.machines).toHaveLength(1);
            expect(config.machines[0]).toEqual({
                id: 1,
                recipe: "iron-gear-wheel",
                productivity: 0.5,
                crafting_speed: 1.25,
                type: "machine"
            });
        });

        it("should parse a config with inserters (belt source)", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 3
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters).toHaveLength(1);
            expect(config.inserters[0].source).toEqual({ type: "belt", id: 1 });
            expect(config.inserters[0].sink).toEqual({ type: "machine", id: 1 });
            expect(config.inserters[0].stack_size).toBe(3);
        });

        it("should parse a config with inserters (machine to machine)", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = [
                    {
                        source { type = "machine", id = 1 }
                        sink { type = "machine", id = 2 }
                        stack_size = 4
                        filters = ["iron-plate", "copper-plate"]
                        overrides {
                            animation {
                                pickup_duration_ticks = 10
                            }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters[0].source).toEqual({ type: "machine", id: 1 });
            expect(config.inserters[0].sink).toEqual({ type: "machine", id: 2 });
            expect(config.inserters[0].filters).toEqual(["iron-plate", "copper-plate"]);
            expect(config.inserters[0].overrides?.animation?.pickup_duration_ticks).toBe(10);
        });

        it("should parse a config with belts (single lane)", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = [
                    {
                        id = 1
                        type = "express-transport-belt"
                        lanes = [
                            { ingredient = "iron-plate", stack_size = 4 }
                        ]
                    }
                ]
            `;

            const config = await parseConfig(hocon);

            expect(config.belts).toHaveLength(1);
            expect(config.belts[0].id).toBe(1);
            expect(config.belts[0].type).toBe("express-transport-belt");
            expect(config.belts[0].lanes).toHaveLength(1);
            expect(config.belts[0].lanes[0]).toEqual({ ingredient: "iron-plate", stack_size: 4 });
        });

        it("should parse a config with belts (two lanes)", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = [
                    {
                        id = 1
                        type = "turbo-transport-belt"
                        lanes = [
                            { ingredient = "iron-plate", stack_size = 4 },
                            { ingredient = "copper-plate", stack_size = 4 }
                        ]
                    }
                ]
            `;

            const config = await parseConfig(hocon);

            expect(config.belts[0].lanes).toHaveLength(2);
            expect(config.belts[0].lanes[1]).toEqual({ ingredient: "copper-plate", stack_size: 4 });
        });

        it("should parse a config with drills", async () => {
            const hocon = `
                target_output {
                    recipe = "iron-plate"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
                drills {
                    mining_productivity_level = 50
                    configs = [
                        {
                            id = 1
                            type = "electric-mining-drill"
                            mined_item_name = "iron-ore"
                            speed_bonus = 0.5
                            target { type = "machine", id = 1 }
                        }
                    ]
                }
            `;

            const config = await parseConfig(hocon);

            expect(config.drills).toBeDefined();
            expect(config.drills?.mining_productivity_level).toBe(50);
            expect(config.drills?.configs).toHaveLength(1);
            expect(config.drills?.configs[0]).toEqual({
                id: 1,
                type: "electric-mining-drill",
                mined_item_name: "iron-ore",
                speed_bonus: 0.5,
                target: { type: "machine", id: 1 }
            });
        });

        it("should parse a config with overrides", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
                overrides {
                    lcm = 120
                    terminal_swing_count = 10
                }
            `;

            const config = await parseConfig(hocon);

            expect(config.overrides?.lcm).toBe(120);
            expect(config.overrides?.terminal_swing_count).toBe(10);
        });

        it("should parse inserter enable_control override with AUTO mode", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            enable_control { mode = "AUTO" }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters[0].overrides?.enable_control).toBeDefined();
            expect(config.inserters[0].overrides?.enable_control?.mode).toBe("AUTO");
        });

        it("should parse inserter enable_control override with ALWAYS mode", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            enable_control { mode = "ALWAYS" }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters[0].overrides?.enable_control?.mode).toBe("ALWAYS");
        });

        it("should parse inserter enable_control override with NEVER mode", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            enable_control { mode = "NEVER" }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters[0].overrides?.enable_control?.mode).toBe("NEVER");
        });

        it("should parse inserter enable_control override with CLOCKED mode", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            enable_control {
                                mode = "CLOCKED"
                                ranges = [
                                    { start = 0, end = 100 },
                                    { start = 200, end = 300 }
                                ]
                                period_duration_ticks = 500
                            }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            const enableControl = config.inserters[0].overrides?.enable_control;
            expect(enableControl?.mode).toBe("CLOCKED");
            if (enableControl?.mode === "CLOCKED") {
                expect(enableControl.ranges).toHaveLength(2);
                expect(enableControl.ranges[0]).toEqual({ start: 0, end: 100 });
                expect(enableControl.ranges[1]).toEqual({ start: 200, end: 300 });
                expect(enableControl.period_duration_ticks).toBe(500);
            }
        });

        it("should parse inserter enable_control CLOCKED mode without optional period_duration_ticks", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            enable_control {
                                mode = "CLOCKED"
                                ranges = [{ start = 0, end = 50 }]
                            }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            const enableControl = config.inserters[0].overrides?.enable_control;
            expect(enableControl?.mode).toBe("CLOCKED");
            if (enableControl?.mode === "CLOCKED") {
                expect(enableControl.ranges).toHaveLength(1);
                expect(enableControl.period_duration_ticks).toBeUndefined();
            }
        });

        it("should parse inserter with both animation and enable_control overrides", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [
                    {
                        source { type = "belt", id = 1 }
                        sink { type = "machine", id = 1 }
                        stack_size = 4
                        overrides {
                            animation {
                                pickup_duration_ticks = 15
                            }
                            enable_control { mode = "ALWAYS" }
                        }
                    }
                ]
                belts = []
            `;

            const config = await parseConfig(hocon);

            expect(config.inserters[0].overrides?.animation?.pickup_duration_ticks).toBe(15);
            expect(config.inserters[0].overrides?.enable_control?.mode).toBe("ALWAYS");
        });

        it("should parse drill enable_control override", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = []
                belts = []
                drills {
                    mining_productivity_level = 50
                    configs = [
                        {
                            id = 1
                            type = "electric-mining-drill"
                            mined_item_name = "iron-ore"
                            speed_bonus = 0.5
                            target { type = "machine", id = 1 }
                            overrides {
                                enable_control { mode = "ALWAYS" }
                            }
                        }
                    ]
                }
            `;

            const config = await parseConfig(hocon);

            expect(config.drills?.configs[0].overrides?.enable_control?.mode).toBe("ALWAYS");
        });

        it("should parse drill enable_control override with CLOCKED mode", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = []
                belts = []
                drills {
                    mining_productivity_level = 50
                    configs = [
                        {
                            id = 1
                            type = "electric-mining-drill"
                            mined_item_name = "iron-ore"
                            speed_bonus = 0.5
                            target { type = "machine", id = 1 }
                            overrides {
                                enable_control {
                                    mode = "CLOCKED"
                                    ranges = [{ start = 10, end = 60 }]
                                }
                            }
                        }
                    ]
                }
            `;

            const config = await parseConfig(hocon);

            const enableControl = config.drills?.configs[0].overrides?.enable_control;
            expect(enableControl?.mode).toBe("CLOCKED");
            if (enableControl?.mode === "CLOCKED") {
                expect(enableControl.ranges).toHaveLength(1);
                expect(enableControl.ranges[0]).toEqual({ start: 10, end: 60 });
            }
        });

        it("should parse all belt types", async () => {
            const beltTypes = Object.values(BeltType)

            for (const beltType of beltTypes) {
                const hocon = `
                    target_output { recipe = "test", items_per_second = 1, copies = 1 }
                    machines = []
                    inserters = []
                    belts = [{ id = 1, type = "${beltType}", lanes = [{ ingredient = "iron-plate", stack_size = 1 }] }]
                `;

                const config = await parseConfig(hocon);
                expect(config.belts[0].type).toBe(beltType);
            }
        });

        it("should parse all drill types", async () => {
            const drillTypes = Object.values(MiningDrillType);
            for (const drillType of drillTypes) {
                const hocon = `
                    target_output { recipe = "test", items_per_second = 1, copies = 1 }
                    machines = []
                    inserters = []
                    belts = []
                    drills {
                        mining_productivity_level = 0
                        configs = [{
                            id = 1
                            type = "${drillType}"
                            mined_item_name = "iron-ore"
                            speed_bonus = 0
                            target { type = "machine", id = 1 }
                        }]
                    }
                `;

                const config = await parseConfig(hocon);
                expect(config.drills?.configs[0].type).toBe(drillType);
            }
        });
    });

    describe("validation errors", () => {
        it("should throw ConfigValidationError for missing required fields", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    # missing items_per_second and machines
                }
                machines = []
                inserters = []
                belts = []
            `;

            await expect(parseConfig(hocon)).rejects.toThrow(ConfigValidationError);
        });

        it("should throw ConfigValidationError for invalid types", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = "not a number"
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
            `;

            await expect(parseConfig(hocon)).rejects.toThrow(ConfigValidationError);
        });

        it("should throw ConfigValidationError for invalid belt type", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = []
                belts = [{ id = 1, type = "invalid-belt-type", lanes = [{ ingredient = "iron-plate", stack_size = 1 }] }]
            `;

            await expect(parseConfig(hocon)).rejects.toThrow(ConfigValidationError);
        });

        it("should throw ConfigValidationError for invalid drill type", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = []
                belts = []
                drills {
                    mining_productivity_level = 0
                    configs = [{
                        id = 1
                        type = "invalid-drill-type"
                        mined_item_name = "iron-ore"
                        speed_bonus = 0
                        target { type = "machine", id = 1 }
                    }]
                }
            `;

            await expect(parseConfig(hocon)).rejects.toThrow(ConfigValidationError);
        });

        it("should throw ConfigValidationError for invalid inserter source type", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = [{ source { type = "invalid", id = 1 }, sink { type = "machine", id = 1 }, stack_size = 1 }]
                belts = []
            `;

            await expect(parseConfig(hocon)).rejects.toThrow(ConfigValidationError);
        });

        it("should provide detailed error messages", async () => {
            const hocon = `
                target_output {
                    recipe = "electronic-circuit"
                    items_per_second = -1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
            `;

            try {
                await parseConfig(hocon);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigValidationError);
                const validationError = error as ConfigValidationError;
                expect(validationError.issues).toHaveLength(1);
                expect(validationError.issues[0].path).toContain("items_per_second");
            }
        });

        it("should report multiple errors", async () => {
            const hocon = `
                target_output {
                    recipe = 123
                    items_per_second = "invalid"
                    machines = -1
                }
                machines = "not an array"
                inserters = []
                belts = []
            `;

            try {
                await parseConfig(hocon);
                expect.fail("Should have thrown");
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigValidationError);
                const validationError = error as ConfigValidationError;
                expect(validationError.issues.length).toBeGreaterThan(1);
            }
        });
    });

    describe("edge cases", () => {
        it("should handle empty arrays", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = []
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);
            expect(config.machines).toEqual([]);
            expect(config.inserters).toEqual([]);
            expect(config.belts).toEqual([]);
        });

        it("should handle optional fields being omitted", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = [{ id = 1, recipe = "test", productivity = 0, crafting_speed = 1 }]
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);
            expect(config.machines[0].type).toBeUndefined();
            expect(config.drills).toBeUndefined();
            expect(config.overrides).toBeUndefined();
        });

        it("should handle zero values where allowed", async () => {
            const hocon = `
                target_output { recipe = "test", items_per_second = 1, copies = 1 }
                machines = [{ id = 1, recipe = "test", productivity = 0, crafting_speed = 1 }]
                inserters = []
                belts = []
                drills {
                    mining_productivity_level = 0
                    configs = [{
                        id = 1
                        type = "electric-mining-drill"
                        mined_item_name = "iron-ore"
                        speed_bonus = 0
                        target { type = "machine", id = 1 }
                    }]
                }
            `;

            const config = await parseConfig(hocon);
            expect(config.machines[0].productivity).toBe(0);
            expect(config.drills?.mining_productivity_level).toBe(0);
            expect(config.drills?.configs[0].speed_bonus).toBe(0);
        });

        it("should handle HOCON substitutions", async () => {
            const hocon = `
                common_recipe = "electronic-circuit"
                target_output { 
                    recipe = \${common_recipe}
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);
            expect(config.target_output.recipe).toBe("electronic-circuit");
        });

        it("should handle HOCON comments", async () => {
            const hocon = `
                # This is a comment
                target_output {
                    recipe = "electronic-circuit" // inline comment
                    items_per_second = 1
                    copies = 1
                }
                machines = []
                inserters = []
                belts = []
            `;

            const config = await parseConfig(hocon);
            expect(config.target_output.recipe).toBe("electronic-circuit");
        });
    });
});

describe("parseConfigSafe", () => {
    it("should return success result for valid config", async () => {
        const hocon = `
            target_output { recipe = "test", items_per_second = 1, copies = 1 }
            machines = []
            inserters = []
            belts = []
        `;

        const result = await parseConfigSafe(hocon);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.config.target_output.recipe).toBe("test");
        }
    });

    it("should return failure result for invalid config", async () => {
        const hocon = `
            target_output { recipe = "test" }
            machines = []
        `;

        const result = await parseConfigSafe(hocon);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ConfigValidationError);
            expect(result.error.issues.length).toBeGreaterThan(0);
        }
    });
});

describe("ConfigValidationError", () => {
    it("should format single error nicely", async () => {
        const hocon = `
            target_output { recipe = 123, items_per_second = 1, copies = 1 }
            machines = []
            inserters = []
            belts = []
        `;

        try {
            await parseConfig(hocon);
        } catch (error) {
            expect(error).toBeInstanceOf(ConfigValidationError);
            const validationError = error as ConfigValidationError;
            expect(validationError.message).toContain("recipe");
        }
    });

    it("should provide getFormattedIssues method", async () => {
        const hocon = `
            target_output { recipe = "test" }
            machines = []
        `;

        try {
            await parseConfig(hocon);
        } catch (error) {
            expect(error).toBeInstanceOf(ConfigValidationError);
            const validationError = error as ConfigValidationError;
            const formatted = validationError.getFormattedIssues();
            expect(typeof formatted).toBe("string");
            expect(formatted.length).toBeGreaterThan(0);
        }
    });
});
