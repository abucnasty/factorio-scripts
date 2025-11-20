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
    overrides?: {
        output_swings?: number;
    }
}

// TODO: allow inserters from a belt to accept an array of ingredients
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