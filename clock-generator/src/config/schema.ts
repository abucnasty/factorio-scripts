import { z } from "zod";
import { MiningDrillType, BeltType } from "../common/entity-types";

// ============================================================================
// Primitive Types
// ============================================================================

export type RecipeName = string;
export type ItemName = string;
export type ResourceName = string;

// ============================================================================
// Machine Configuration
// ============================================================================

export const MachineConfigurationSchema = z.object({
    id: z.number().int().positive(),
    recipe: z.string(),
    productivity: z.number().min(0),
    crafting_speed: z.number().positive(),
    type: z.enum(["machine", "furnace"]).optional()
});

export type MachineConfiguration = z.infer<typeof MachineConfigurationSchema>;

// ============================================================================
// Target Production Rate Configuration
// ============================================================================

export const TargetProductionRateConfigSchema = z.object({
    recipe: z.string(),
    items_per_second: z.number().positive(),
    machines: z.number().int().positive(),
    overrides: z.object({
        output_swings: z.number().int().positive().optional()
    }).optional()
});

export type TargetProductionRateConfig = z.infer<typeof TargetProductionRateConfigSchema>;

// ============================================================================
// Mining Drill Configuration
// ============================================================================

const MiningDrillTypeSchema = z.enum([
    MiningDrillType.ELECTRIC_MINING_DRILL,
    MiningDrillType.BURNER_MINING_DRILL,
    MiningDrillType.BIG_MINING_DRILL
]);

export const DrillTargetMachineConfigSchema = z.object({
    type: z.literal("machine"),
    id: z.number().int().positive()
});

export type DrillTargetMachineConfig = z.infer<typeof DrillTargetMachineConfigSchema>;

export const MiningDrillConfigSchema = z.object({
    id: z.number().int().positive(),
    type: MiningDrillTypeSchema,
    mined_item_name: z.string(),
    /**
     * The speed bonus can be obtained by hovering over the drill and typing:
     * `/c game.print(game.player.selected.speed_bonus)`
     */
    speed_bonus: z.number(),
    target: DrillTargetMachineConfigSchema
});

export type MiningDrillConfig = z.infer<typeof MiningDrillConfigSchema>;

export const DrillsConfigSchema = z.object({
    /**
     * The mining productivity level to apply to all mining drills.
     * The value here is the current researched level and can be set in-game by running the command:
     * `/c game.player.force.technologies['mining-productivity-3'].level = X+1`
     */
    mining_productivity_level: z.number().int().min(0),
    configs: z.array(MiningDrillConfigSchema)
});

export type DrillsConfig = z.infer<typeof DrillsConfigSchema>;

// ============================================================================
// Inserter Configuration
// ============================================================================

export const InserterBeltConfigSchema = z.object({
    type: z.literal("belt"),
    id: z.number().int().positive()
});

export type InserterBeltConfig = z.infer<typeof InserterBeltConfigSchema>;

export const InserterMachineConfigSchema = z.object({
    type: z.literal("machine"),
    id: z.number().int().positive()
});

export type InserterMachineConfig = z.infer<typeof InserterMachineConfigSchema>;

export const InserterAnimationOverrideConfigSchema = z.object({
    pickup_duration_ticks: z.number().int().positive().optional()
});

export type InserterAnimationOverrideConfig = z.infer<typeof InserterAnimationOverrideConfigSchema>;

export const InserterConfigSchema = z.object({
    source: z.discriminatedUnion("type", [
        InserterBeltConfigSchema,
        InserterMachineConfigSchema
    ]),
    sink: z.discriminatedUnion("type", [
        InserterBeltConfigSchema,
        InserterMachineConfigSchema
    ]),
    stack_size: z.number().int().positive(),
    filters: z.array(z.string()).optional(),
    overrides: InserterAnimationOverrideConfigSchema.optional()
});

export type InserterConfig = z.infer<typeof InserterConfigSchema>;

// Legacy type aliases for backwards compatibility
export type InserterStackSizeConfig = { stack_size: number };
export type InserterFilterConfig = { filters: ItemName[] };

// ============================================================================
// Belt Configuration
// ============================================================================

const BeltTypeSchema = z.enum([
    BeltType.TRANSPORT_BELT,
    BeltType.FAST_TRANSPORT_BELT,
    BeltType.EXPRESS_TRANSPORT_BELT,
    BeltType.TURBO_TRANSPORT_BELT
]);

export const BeltLaneConfigSchema = z.object({
    ingredient: z.string(),
    stack_size: z.number().int().positive()
});

export type BeltLaneConfig = z.infer<typeof BeltLaneConfigSchema>;

export const BeltConfigSchema = z.object({
    id: z.number().int().positive(),
    type: BeltTypeSchema,
    lanes: z.union([
        z.tuple([BeltLaneConfigSchema]),
        z.tuple([BeltLaneConfigSchema, BeltLaneConfigSchema])
    ])
});

export type BeltConfig = z.infer<typeof BeltConfigSchema>;

// ============================================================================
// Config Overrides
// ============================================================================

export const ConfigOverridesSchema = z.object({
    lcm: z.number().int().positive().optional(),
    terminal_swing_count: z.number().int().positive().optional()
});

export type ConfigOverrides = z.infer<typeof ConfigOverridesSchema>;

// ============================================================================
// Root Config
// ============================================================================

export const ConfigSchema = z.object({
    target_output: TargetProductionRateConfigSchema,
    machines: z.array(MachineConfigurationSchema),
    drills: DrillsConfigSchema.optional(),
    inserters: z.array(InserterConfigSchema),
    belts: z.array(BeltConfigSchema),
    overrides: ConfigOverridesSchema.optional()
});

export type Config = z.infer<typeof ConfigSchema>;
