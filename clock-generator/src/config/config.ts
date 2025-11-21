import { ItemName } from "../data/factorio-data-types";

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

// TODO: the ingredient field should instead be a filter property and the ingredient should be sourced from either a machine or a belt
export type InserterBeltConfig = { type: "belt", ingredient: ItemName };
export type InserterMachineConfig = { type: "machine"; machine_id: number; };

export interface InserterConfiguration {
    source: InserterBeltConfig | InserterMachineConfig;
    target: InserterBeltConfig | InserterMachineConfig;
    stack_size: number;
}

export const BeltType = {
    TRANSPORT_BELT: "transport-belt",
    FAST_TRANSPORT_BELT: "fast-transport-belt",
    EXPRESS_TRANSPORT_BELT: "express-transport-belt",
    TURBO_TRANSPORT_BELT: "turbo-transport-belt"
} as const;

export type BeltType = typeof BeltType[keyof typeof BeltType];

export interface BeltLaneConfig {
    ingredient: ItemName;
    stack_size: number;
}

export interface BeltConfig {
    id: number;
    type: BeltType;
    lanes: [BeltLaneConfig] | [BeltLaneConfig, BeltLaneConfig]
}


export interface Config {
    target_output: TargetProductionRate;
    machines: MachineConfiguration[];
    inserters: InserterConfiguration[];
    belts: BeltConfig[];
}