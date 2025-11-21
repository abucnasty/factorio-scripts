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
            source: { type: "belt", ingredient: "low-density-structure" },
            target: { type: "machine", machine_id: 1 },
            // hack alert: using this to compensate for this one inserter grabbing 
            // either processing-units or flying robot frames
            stack_size: 16,
        },
        {
            source: { type: "belt", ingredient: "processing-unit" },
            target: { type: "machine", machine_id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "belt", ingredient: "flying-robot-frame" },
            target: { type: "machine", machine_id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: 1 },
            target: { type: "belt", ingredient: "utility-science-pack" },
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
        machines: 11,
        overrides: {
            output_swings: 4
        }
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
            source: { type: "belt", ingredient: "transport-belt" },
            target: { type: "machine", machine_id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "belt", ingredient: "inserter" },
            target: { type: "machine", machine_id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: 1 },
            target: { type: "belt", ingredient: "logistics-science-pack" },
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

// TODO: impplement this after multiple ingredient inserter support is added
export const LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG: Config = {
    target_output: {
        recipe: "logistic-science-pack",
        items_per_second: 240,
        machines: 11,
        overrides: {
            output_swings: 4
        }
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
            source: { type: "belt", ingredient: "transport-belt" },
            target: { type: "machine", machine_id: 1 },
            stack_size: 16,
        },
        {
            source: { type: "machine", machine_id: 1 },
            target: { type: "belt", ingredient: "logistics-science-pack" },
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