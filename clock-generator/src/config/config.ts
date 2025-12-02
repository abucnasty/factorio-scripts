import { ItemName } from "../data/factorio-data-types";

export type RecipeName = string;

export interface MachineConfiguration {
    id: number;
    recipe: RecipeName;
    productivity: number;
    crafting_speed: number;
}

export interface TargetProductionRateConfig {
    recipe: RecipeName;
    items_per_second: number;
    machines: number;
    overrides?: {
        output_swings?: number;
    }
}

export type InserterStackSizeConfig = { stack_size: number }
export type InserterFilterConfig = { filters: ItemName[] }
export type InserterBeltConfig = { type: "belt", id: number }
export type InserterMachineConfig = { type: "machine"; id: number; }

export type InserterAnimationOverrideConfig = {
    pickup_duration_ticks?: number;
}

export type InserterConfig = {
    source: InserterBeltConfig | InserterMachineConfig;
    sink: InserterBeltConfig | InserterMachineConfig;
    stack_size: number;
    overrides?: InserterAnimationOverrideConfig
} & InserterStackSizeConfig & Partial<InserterFilterConfig>;

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
    target_output: TargetProductionRateConfig;
    machines: MachineConfiguration[];
    inserters: InserterConfig[];
    belts: BeltConfig[];
}