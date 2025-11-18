export type RecipeName = string;

export interface MachineConfiguration {
    id: number;
    recipe: RecipeName;
    productivity: number;
    crafting_speed: number;
}

export interface TargetProductionRate {
    recipe: RecipeName;
    items_per_second: number;
    machines: number;
}

export type InserterBeltConfig = { type: "belt", ingredient: string };
export type InserterMachineConfig = { type: "machine"; machine_id: number; };

export interface InserterConfiguration {
    source: InserterBeltConfig | InserterMachineConfig;
    target: InserterBeltConfig | InserterMachineConfig;
    stack_size: number;
}


export interface Config {
    target_output: TargetProductionRate;
    machines: MachineConfiguration[];
    inserters: InserterConfiguration[];
}

// interface ProductionRate {
//     items_per_second: number;
//     machines: number;

// }

// interface DesignConfig {
//     name: string;
//     target_output: {
//         recipe: RecipeName;
//     }
// }

// interface Machine {
//     id: number;
//     recipe: string;
//     overload_multiplier: number;
//     productivity: number;
//     crafting_speed: number;
// }

// interface Inserter {
//     stack_size: number;
//     insertion_type: "belt" | "direct";
//     source: number;
//     target: number;
// }



// const testConfig = {
//     name: "productivity-module-production",
//     target_output: {
//         recipe: "productivity-module",
//         items_per_second: 40,
//         machines: 4,
//         swing_count: 1,
//     },
//     machines: [
//         {
//             recipe: "productivity-module",
//             productivity: 50,
//             overload_multiplier: 11,
//             crafting_speed: 124.65,
//             output_inserter: {
//                 stack_size: 8,
//                 insertion_type: "belt",
//             },
//             inserter_count: 1,
//         },
//         {
//             recipe: "advanced-circuit",
//             productivity: 175,
//             overload_multiplier: 18,
//             crafting_speed: 83.9,
//             output_inserter: {
//                 stack_size: 16,
//                 insertion_type: "direct",
//             },
//             inserter_count: 1,
//         },
//         {
//             recipe: "electronic-circuit",
//             productivity: 175,
//             overload_multiplier: 100,
//             crafting_speed: 63.75,
//             output_inserter: {
//                 stack_size: 16,
//                 insertion_type: "direct",
//             },
//             inserter_count: 1,
//         },
//     ],
//     input_inserters: [
//         {
//             source_recipe: "advanced-circuit",
//             target_recipe: "productivity-module",
//             stack_size: 16,
//             insertion_type: "direct",
//             inserter_count: 1,
//         },
//         {
//             source_recipe: "electronic-circuit",
//             target_recipe: "advanced-circuit",
//             stack_size: 16,
//             insertion_type: "direct",
//             inserter_count: 1,
//         },
//         {
//             source_recipe: "electronic-circuit",
//             target_recipe: "productivity-module",
//             stack_size: 16,
//             insertion_type: "direct",
//             inserter_count: 1,
//         },
//     ],
// };