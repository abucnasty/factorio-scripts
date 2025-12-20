import { Config } from "./config";

export const UTILITY_SCIENCE_CONFIG: Config = {
    target_output: {
        recipe: "utility-science-pack",
        items_per_second: 120,
        machines: 7,
        overrides: {
            output_swings: 3
        }
    },
    machines: [
        {
            id: 1,
            recipe: "utility-science-pack",
            productivity: 100,
            crafting_speed: 68.90625,
        },
    ],
    inserters: [
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["low-density-structure", "processing-unit"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 2 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
            filters: ["low-density-structure", "flying-robot-frame"]
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            filters: ["utility-science-pack"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "low-density-structure",
                    stack_size: 4
                },
                {
                    ingredient: "processing-unit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "low-density-structure",
                    stack_size: 4
                },
                {
                    ingredient: "flying-robot-frame",
                    stack_size: 4
                }
            ]
        }
    ]
};

export const LOGISTIC_SCIENCE_CONFIG: Config = {
    target_output: {
        recipe: "logistic-science-pack",
        items_per_second: 240,
        machines: 11
    },
    machines: [
        {
            id: 1,
            recipe: "logistic-science-pack",
            productivity: 100,
            crafting_speed: 68.906247615814,
        },
    ],
    inserters: [
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["inserter"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["transport-belt"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1, },
            filters: ["logistic-science-pack"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "transport-belt",
                    stack_size: 4
                },
                {
                    ingredient: "inserter",
                    stack_size: 4
                }
            ]
        }
    ]
};

export const LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG: Config = {
    target_output: {
        recipe: "logistic-science-pack",
        items_per_second: 240,
        machines: 11,
    },
    machines: [
        {
            id: 1,
            recipe: "logistic-science-pack",
            productivity: 100,
            crafting_speed: 68.906247615814,
        },
    ],
    inserters: [
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["transport-belt", "inserter"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1, },
            filters: ["logistic-science-pack"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "transport-belt",
                    stack_size: 4
                },
                {
                    ingredient: "inserter",
                    stack_size: 4
                }
            ]
        }
    ]
};

export const ADVANCED_CIRCUIT_CONFIG: Config = {
    target_output: {
        recipe: "advanced-circuit",
        items_per_second: 120,
        machines: 3,
    },
    machines: [
        {
            id: 1,
            recipe: "advanced-circuit",
            productivity: 175,
            crafting_speed: 95,
        },
        {
            id: 2,
            recipe: "electronic-circuit",
            productivity: 175,
            crafting_speed: 100,
        },
        {
            id: 3,
            recipe: "plastic-bar",
            productivity: 300,
            crafting_speed: 100,
        },
        {
            id: 4,
            recipe: "copper-cable",
            productivity: 150,
            crafting_speed: 112.2,
        }
    ],
    inserters: [
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            stack_size: 16,
        },
    ],
    belts: []
}

export const PRODUCTIVITY_MODULE_CONFIG: Config = {
    target_output: {
        recipe: "productivity-module",
        items_per_second: 40,
        machines: 3,
    },
    machines: [
        {
            id: 5,
            recipe: "productivity-module",
            productivity: 50,
            crafting_speed: 124.65,
        },
        {
            id: 1,
            recipe: "advanced-circuit",
            productivity: 175,
            crafting_speed: 95,
        },
        {
            id: 2,
            recipe: "electronic-circuit",
            productivity: 175,
            crafting_speed: 100,
        },
        {
            id: 3,
            recipe: "plastic-bar",
            productivity: 300,
            crafting_speed: 100,
        },
        {
            id: 4,
            recipe: "copper-cable",
            productivity: 150,
            crafting_speed: 112.2,
        }
    ],
    inserters: [
        {
            source: { type: "machine", id: 1 },
            sink: { type: "machine", id: 5 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 5 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 5 },
            sink: { type: "belt", id: 1 },
            stack_size: 16,
        },
    ],
    belts: []
}

/**
 * TODO:
 * - need to be able to support multiple machines feeding into a single machine
 * - in the planning phase, potentially make the machines just virtual states that just always supply the amount required
 *   - this would be a "virtual" machine that just has an infinite supply of outputs
 * - in the runtime phase, we can then allocate real machines to feed into the target machine
 * - for inserters feeding from multiple sources, if their ranges overlap, we should merge their range to just one output
 */
export const ELECTRIC_FURNACE_CONFIG: Config = {
    target_output: {
        recipe: "electric-furnace",
        items_per_second: 20,
        machines: 2,
    },
    machines: [
        {
            id: 1,
            recipe: "electric-furnace",
            productivity: 0,
            crafting_speed: 57.8125,
        },
        {
            id: 2,
            recipe: "casting-steel",
            productivity: 300,
            crafting_speed: 185,
        },
        {
            id: 3,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
            type: "furnace"
        },
        {
            id: 4,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
            type: "furnace"
        },
        {
            id: 5,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
            type: "furnace"
        }
    ],
    inserters: [
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["advanced-circuit"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            filters: ["steel-plate"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 1 },
            filters: ["stone-brick"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 1 },
            filters: ["stone-brick"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 5 },
            sink: { type: "machine", id: 1 },
            filters: ["stone-brick"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 2 },
            filters: ["electric-furnace"],
            stack_size: 16,
        },
    ],
    drills: {
        mining_productivity_level: 8000,
        configs: [
            {
                id: 1,
                type: "electric-mining-drill",
                mined_item_name: "stone",
                speed_bonus: 12.5,
                target: { type: "machine", id: 3 }
            },
            {
                id: 2,
                type: "electric-mining-drill",
                mined_item_name: "stone",
                speed_bonus: 12.5,
                target: { type: "machine", id: 4 }
            },
            {
                id: 3,
                type: "electric-mining-drill",
                mined_item_name: "stone",
                speed_bonus: 12.5,
                target: { type: "machine", id: 5 }
            }
        ]
    },
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "advanced-circuit", stack_size: 4 },
                { ingredient: "advanced-circuit", stack_size: 4 }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "electric-furnace", stack_size: 4 },
                { ingredient: "electric-furnace", stack_size: 4 }
            ]
        },
        {
            id: 3,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "stone", stack_size: 4 },
                { ingredient: "stone", stack_size: 4 }
            ]
        }
    ]
}

export const PRODUCTION_SCIENCE_CONFIG: Config = {
    target_output: {
        recipe: "production-science-pack",
        items_per_second: 120,
        machines: 7,
    },
    machines: [
        {
            id: 1,
            recipe: "production-science-pack",
            productivity: 100,
            crafting_speed: 63,
        },
        {
            id: 2,
            recipe: "rail",
            productivity: 0,
            crafting_speed: 46.375,
        },
        {
            id: 3,
            recipe: "casting-steel",
            productivity: 300,
            crafting_speed: 122.5,
        },
        {
            id: 4,
            recipe: "casting-iron-stick",
            productivity: 150,
            crafting_speed: 66.5,
        },
    ],
    drills: {
        mining_productivity_level: 8000,
        configs: [
            {
                id: 1,
                type: "electric-mining-drill",
                mined_item_name: "stone",
                speed_bonus: 8.84,
                target: { type: "machine", id: 2 }
            },
        ]
    },
    inserters: [
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            filters: ["production-science-pack"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["productivity-module"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["electric-furnace"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            // filters: ["rail"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 2 },
            // filters: ["steel-plate"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 2 },
            // filters: ["iron-stick"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "productivity-module", stack_size: 4 },
                { ingredient: "electric-furnace", stack_size: 4 }
            ]
        },
    ]
}

export const PRODUCTION_SCIENCE_CONFIG_SHARED: Config = {
    ...PRODUCTION_SCIENCE_CONFIG,
    inserters: PRODUCTION_SCIENCE_CONFIG.inserters
        .filter(it => {
            const filters = it.filters ?? [];
            const from_belt = filters.includes("productivity-module") || filters.includes("electric-furnace");
            return !from_belt;
        })
        .concat(
            {
                source: { type: "belt", id: 1 },
                sink: { type: "machine", id: 1 },
                filters: ["productivity-module", "electric-furnace"],
                stack_size: 16,
            },
        )
}

export const STONE_BRICKS_DIRECT_INSERT_MINING: Config = {
    target_output: {
        recipe: "stone-brick",
        items_per_second: 120,
        machines: 3,
    },
    machines: [
        {
            id: 1,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 91.899995803833,
            type: "furnace"
        },
    ],
    inserters: [
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            filters: ["stone-brick"],
            stack_size: 16,
        }
    ],
    drills: {
        mining_productivity_level: 8000,
        configs: [
            {
                id: 1,
                type: "electric-mining-drill",
                mined_item_name: "stone",
                speed_bonus: 15.310000419617,
                target: { type: "machine", id: 1 }
            },
        ]
    },
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "stone-brick", stack_size: 4 },
                { ingredient: "stone-brick", stack_size: 4 }
            ]
        },
    ]
}

/**
 * this is an example configuration of a one to many output machine setup. This is currently not supported,
 * but should be able to supported
 * - two machines producing engine units
 * - one machine producing pipes feeding into both engine unit assembly machine
 * - one machine producing iron plates feeding into the pipe assembly machine
 */
export const CHEMICAL_SCIENCE_ENGINES: Config = {
    target_output: {
        recipe: "engine-unit",
        items_per_second: 60,
        machines: 5,
    },
    machines: [
        {
            id: 1,
            recipe: "engine-unit",
            productivity: 100,
            crafting_speed: 62.999999523163,
        },
        {
            id: 4,
            recipe: "engine-unit",
            productivity: 100,
            crafting_speed: 62.999999523163,
        },
        {
            id: 2,
            recipe: "pipe",
            productivity: 0,
            crafting_speed: 52.562499046326,
        },
        {
            id: 3,
            recipe: "iron-plate",
            productivity: 50,
            crafting_speed: 57.600002288818,
            type: "furnace"
        }
    ],
    inserters: [
        {
            sink: { type: "belt", id: 1 },
            source: { type: "machine", id: 1 },
            stack_size: 16,
        },
        {
            sink: { type: "belt", id: 1 },
            source: { type: "machine", id: 4 },
            stack_size: 16,
        },
        {
            sink: { type: "machine", id: 1 },
            source: { type: "machine", id: 2 },
            stack_size: 16,
            filters: ["pipe"]
        },
        {
            sink: { type: "machine", id: 4 },
            source: { type: "machine", id: 2 },
            stack_size: 16,
            filters: ["pipe"]
        },
        {
            sink: { type: "machine", id: 2 },
            source: { type: "machine", id: 3 },
            stack_size: 16,
        },
        {
            sink: { type: "machine", id: 3 },
            source: { type: "belt", id: 3 },
            stack_size: 16,
        },
        {
            sink: { type: "machine", id: 1 },
            source: { type: "belt", id: 2 },
            stack_size: 16,
            filters: ["steel-plate", "iron-gear-wheel"]
        },
        {
            sink: { type: "machine", id: 4 },
            source: { type: "belt", id: 2 },
            stack_size: 16,
            filters: ["steel-plate", "iron-gear-wheel"]
        }
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "engine-unit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "steel-plate",
                    stack_size: 4
                },
                {
                    ingredient: "iron-gear-wheel",
                    stack_size: 4
                }
            ]
        },
        {
            id: 3,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "iron-ore",
                    stack_size: 4
                }
            ]
        },
        
    ]
}


export const CHEMICAL_SCIENCE_ADVANCED_CIRCUIT_CONFIG: Config = {
    overrides: {
        lcm: 27,
        terminal_swing_count: 2
    },
    target_output: {
        recipe: "advanced-circuit",
        items_per_second: 90,
        machines: 2,
    },
    machines: [
        {
            id: 1,
            recipe: "advanced-circuit",
            productivity: 175,
            crafting_speed: 100.05000114441,
        },
        {
            id: 2,
            recipe: "electronic-circuit",
            productivity: 175,
            crafting_speed: 32.5,
        },
        {
            id: 3,
            recipe: "plastic-bar",
            productivity: 300,
            crafting_speed: 33.975,
        },
        {
            id: 4,
            recipe: "copper-cable",
            productivity: 175,
            crafting_speed: 55.349998474121,
        },
        {
            id: 5,
            recipe: "copper-plate",
            productivity: 50,
            crafting_speed: 65.999999046326,
            type: "furnace"
        },
        {
            id: 6,
            recipe: "iron-plate",
            productivity: 50,
            crafting_speed: 86.149997711182,
            type: "furnace"
        }
    ],
    inserters: [
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
            filters: ["electronic-circuit"]
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
            filters: ["plastic-bar"]
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 1 },
            stack_size: 16,
            filters: ["copper-cable"]
        },
        {
            source: { type: "machine", id: 4 },
            sink: { type: "machine", id: 2 },
            stack_size: 16,
            filters: ["copper-cable"]
        },
        {
            source: { type: "machine", id: 5 },
            sink: { type: "machine", id: 4 },
            stack_size: 16,
            filters: ["copper-plate"]
        },
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 1 },
            stack_size: 16,
            filters: ["advanced-circuit"]
        },
        {
            source: { type: "belt", id: 2 },
            sink: { type: "machine", id: 3 },
            stack_size: 16,
            filters: ["coal"]
        },
        {
            source: { type: "belt", id: 3 },
            sink: { type: "machine", id: 5 },
            stack_size: 16,
            filters: ["copper-ore"]
        },
        {
            source: { type: "machine", id: 6 },
            sink: { type: "machine", id: 2 },
            stack_size: 16,
            filters: ["iron-plate"]
        },
        {
            source: { type: "belt", id: 3 },
            sink: { type: "machine", id: 6 },
            stack_size: 16,
            filters: ["iron-ore"]
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "advanced-circuit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "coal",
                    stack_size: 4
                }
            ]
        },
        {
            id: 3,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "copper-ore",
                    stack_size: 4
                },
                {
                    ingredient: "iron-ore",
                    stack_size: 4
                }
            ]
        }
    ]
}

export const CHEMICAL_SCIENCE_CONFIG: Config = {
    target_output: {
        recipe: "chemical-science-pack",
        items_per_second: 120,
        machines: 11,
    },
    machines: [
        {
            id: 1,
            recipe: "chemical-science-pack",
            productivity: 100,
            crafting_speed: 68.906247615814,
        },
    ],
    inserters: [
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 3, },
            filters: ["chemical-science-pack"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 1 },
            filters: ["advanced-circuit"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 2 },
            sink: { type: "machine", id: 1 },
            filters: ["sulfur", "engine-unit"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "advanced-circuit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "sulfur",
                    stack_size: 4
                },
                {
                    ingredient: "engine-unit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 3,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "chemical-science-pack",
                    stack_size: 4
                }
            ]
        },
    ]
}

export const CHEMICAL_SCIENCE_DI_ENGINE_CONFIG: Config = {
    target_output: {
        recipe: "chemical-science-pack",
        items_per_second: 120,
        machines: 11,
    },
    machines: [
        {
            id: 1,
            recipe: "chemical-science-pack",
            productivity: 100,
            crafting_speed: 66.031247377396,
        },
        {
            id: 2,
            recipe: "engine-unit",
            productivity: 100,
            crafting_speed: 49.093750119209,
        },
        {
            id: 3,
            recipe: "casting-pipe",
            productivity: 50,
            crafting_speed: 236.80000305176,
        }
    ],
    inserters: [
        {
            source: { type: "machine", id: 1 },
            sink: { type: "belt", id: 3, },
            filters: ["chemical-science-pack"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 2 },
            sink: { type: "machine", id: 1 },
            filters: ["sulfur", "advanced-circuit"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 2 },
            sink: { type: "machine", id: 1 },
            filters: ["engine-unit"],
            stack_size: 16,
        },
        {
            source: { type: "belt", id: 1 },
            sink: { type: "machine", id: 2 },
            filters: ["steel-plate", "iron-gear-wheel"],
            stack_size: 16,
        },
        {
            source: { type: "machine", id: 3 },
            sink: { type: "machine", id: 2 },
            filters: ["pipe"],
            stack_size: 16,
        },
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "steel-plate",
                    stack_size: 4
                },
                {
                    ingredient: "iron-gear-wheel",
                    stack_size: 4
                }
            ]
        },
        {
            id: 2,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "sulfur",
                    stack_size: 4
                },
                {
                    ingredient: "advanced-circuit",
                    stack_size: 4
                }
            ]
        },
        {
            id: 3,
            type: "turbo-transport-belt",
            lanes: [
                {
                    ingredient: "chemical-science-pack",
                    stack_size: 4
                }
            ]
        },
    ]
}