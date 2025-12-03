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
            crafting_speed: 68.90625,
            // crafting_speed: 68.906247615814
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
            crafting_speed: 68.90625,
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
            productivity: 50,
            crafting_speed: 185,
        },
        {
            id: 3,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
        },
        {
            id: 4,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
        },
        {
            id: 5,
            recipe: "stone-brick",
            productivity: 50,
            crafting_speed: 80.05,
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
        }
    ],
    belts: [
        {
            id: 1,
            type: "turbo-transport-belt",
            lanes: [
                { ingredient: "advanced-circuit", stack_size: 4 },
                { ingredient: "advanced-circuit", stack_size: 4 }
            ]
        }
    ]
}