import { ItemName, ResourceName } from "../data/factorio-data-types";
import { MiningDrillType } from "../entities/drill/mining-drill";

export type RecipeName = string;

export interface MachineConfiguration {
    id: number;
    recipe: RecipeName;
    productivity: number;
    crafting_speed: number;
    type?: "machine" | "furnace"
}

export interface TargetProductionRateConfig {
    recipe: RecipeName;
    items_per_second: number;
    machines: number;
    overrides?: {
        output_swings?: number;
    }
}

export type DrillTargetMachineConfig = { type: "machine"; id: number; }

/**
 * TODO: not supported yet but will need this for direct insertion mining drills
 */
export interface MiningDrillConfig {
    id: number;
    type: MiningDrillType;
    mined_item_name: ResourceName;
    /**
     * the speed bonus can be obtained by hovering over the drill and typing:
     * 
     * `/c game.print(game.player.selected.speed_bonus)`
     */
    speed_bonus: number;
    target: DrillTargetMachineConfig;
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

export type DrillsConfig = {
    /**
     * The mining productivity level to apply to all mining drills.
     * The value here is the current researched level and can be set in-game by running the command:
     * 
     * `/c game.player.force.technologies['mining-productivity-3'].level = X+1`
     */
    mining_productivity_level: number;
    configs: MiningDrillConfig[];
}


export interface ConfigOverrides {
    lcm?: number,
    terminal_swing_count?: number,
}


export interface Config {
    target_output: TargetProductionRateConfig;
    machines: MachineConfiguration[];
    drills?: DrillsConfig;
    inserters: InserterConfig[];
    belts: BeltConfig[];
    overrides?: ConfigOverrides
}