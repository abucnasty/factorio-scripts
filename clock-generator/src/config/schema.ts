import { z } from "zod";
import { MiningDrillType, BeltType, ChestType } from "../common/entity-types";

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

/**
 * Schema for target production rate configuration.
 * 
 * @property recipe - The recipe name to produce
 * @property items_per_second - Target production rate in items per second
 * @property copies - Number of duplicate setups being modeled (multiplier for ratio calculations)
 */
export const TargetProductionRateConfigSchema = z.object({
    recipe: z.string(),
    items_per_second: z.number().positive(),
    copies: z.number().int().positive()
});

export type TargetProductionRateConfig = z.infer<typeof TargetProductionRateConfigSchema>;

// ============================================================================
// Enable Control Override Configuration
// ============================================================================

/**
 * Mode for enable control override.
 * - AUTO: Use automatic control logic (default)
 * - ALWAYS: Always enabled
 * - NEVER: Never enabled
 * - CLOCKED: Use custom clocked ranges
 */
export const EnableControlModeSchema = z.enum(["AUTO", "ALWAYS", "NEVER", "CLOCKED"]);

export type EnableControlMode = z.infer<typeof EnableControlModeSchema>;

/**
 * Range for clocked enable control.
 */
export const EnableControlRangeSchema = z.object({
    start: z.number().int().min(0),
    end: z.number().int().positive()
});

export type EnableControlRange = z.infer<typeof EnableControlRangeSchema>;

/**
 * Base schema for enable control override with mode discriminator.
 */
const EnableControlOverrideAutoSchema = z.object({
    mode: z.literal("AUTO")
});

const EnableControlOverrideAlwaysSchema = z.object({
    mode: z.literal("ALWAYS")
});

const EnableControlOverrideNeverSchema = z.object({
    mode: z.literal("NEVER")
});

const EnableControlOverrideClockedSchema = z.object({
    mode: z.literal("CLOCKED"),
    /**
     * The tick ranges during which the entity is enabled.
     */
    ranges: z.array(EnableControlRangeSchema).min(1),
    /**
     * Optional period duration in ticks. If not specified, falls back to crafting cycle duration.
     */
    period_duration_ticks: z.number().int().positive().optional()
});

export const EnableControlOverrideConfigSchema = z.discriminatedUnion("mode", [
    EnableControlOverrideAutoSchema,
    EnableControlOverrideAlwaysSchema,
    EnableControlOverrideNeverSchema,
    EnableControlOverrideClockedSchema
]);

export type EnableControlOverrideConfig = z.infer<typeof EnableControlOverrideConfigSchema>;

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

/**
 * Overrides configuration for mining drills.
 */
export const MiningDrillOverridesConfigSchema = z.object({
    enable_control: EnableControlOverrideConfigSchema.optional()
});

export type MiningDrillOverridesConfig = z.infer<typeof MiningDrillOverridesConfigSchema>;

export const MiningDrillConfigSchema = z.object({
    id: z.number().int().positive(),
    type: MiningDrillTypeSchema,
    mined_item_name: z.string(),
    /**
     * The speed bonus can be obtained by hovering over the drill and typing:
     * `/c game.print(game.player.selected.speed_bonus)`
     */
    speed_bonus: z.number(),
    target: DrillTargetMachineConfigSchema,
    overrides: MiningDrillOverridesConfigSchema.optional()
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

export const InserterChestConfigSchema = z.object({
    type: z.literal("chest"),
    id: z.number().int().positive()
});

export type InserterChestConfig = z.infer<typeof InserterChestConfigSchema>;

export const InserterAnimationOverrideConfigSchema = z.object({
    pickup_duration_ticks: z.number().int().positive().optional()
});

export type InserterAnimationOverrideConfig = z.infer<typeof InserterAnimationOverrideConfigSchema>;

/**
 * Overrides configuration for inserters.
 * Contains animation overrides and enable control overrides.
 */
export const InserterOverridesConfigSchema = z.object({
    animation: InserterAnimationOverrideConfigSchema.optional(),
    enable_control: EnableControlOverrideConfigSchema.optional()
});

export type InserterOverridesConfig = z.infer<typeof InserterOverridesConfigSchema>;

export const InserterConfigSchema = z.object({
    source: z.discriminatedUnion("type", [
        InserterBeltConfigSchema,
        InserterMachineConfigSchema,
        InserterChestConfigSchema
    ]),
    sink: z.discriminatedUnion("type", [
        InserterBeltConfigSchema,
        InserterMachineConfigSchema,
        InserterChestConfigSchema
    ]),
    stack_size: z.number().int().positive(),
    filters: z.array(z.string()).optional(),
    overrides: InserterOverridesConfigSchema.optional()
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
// Chest Configuration
// ============================================================================

export const BufferChestConfigSchema = z.object({
    type: z.literal(ChestType.BUFFER_CHEST),

    id: z.number().int().positive(),
    storage_size: z.number().int().positive(),
    /**
     * The single item type this chest is filtered to hold.
     * Chests only support one item type for simplicity.
     */
    item_filter: z.string()
});

export type BufferChestConfig = z.infer<typeof BufferChestConfigSchema>;


export const InfinityFilterConfigSchema = z.object({
    /**
     * The entity name of the item to request
     */
    item_name: z.string(),
    /**
     * The count of items to request from the infinity chest each time.
     */
    request_count: z.number().int().positive()
});

export type InfinityFilterConfig = z.infer<typeof InfinityFilterConfigSchema>;
/**
 * This configuration is for chests that have no input inserters.
 * 
 * This can be a requester chest, an infinity chest, a buffer chest, etc.
 * 
 * It can also be used to mock an input to a machine that is always available.
 */
export const InfinityChestConfigSchema = z.object({
    type: z.literal(ChestType.INFINITY_CHEST),
    id: z.number().int().positive(),
    item_filter: z.array(InfinityFilterConfigSchema).min(1)
});

export type InfinityChestConfig = z.infer<typeof InfinityChestConfigSchema>;

export const ChestConfigSchema = z.discriminatedUnion("type", [
    BufferChestConfigSchema,
    InfinityChestConfigSchema
]);

export type ChestConfig = z.infer<typeof ChestConfigSchema>;

// ============================================================================
// Config Overrides
// ============================================================================

export const ConfigOverridesSchema = z.object({
    lcm: z.number().int().positive().optional(),
    terminal_swing_count: z.number().int().positive().optional(),
    /**
     * Enable fractional swing support for inserters.
     * 
     * When enabled, inserters with fractional swing counts (e.g., 3/2 swings per cycle)
     * will have their cycles extended to distribute swings across multiple sub-cycles.
     * For example, 3/2 swings becomes 1 swing in the first sub-cycle and 2 swings in the second.
     * 
     * The swing distribution uses a back-loaded strategy to maximize items available
     * before swinging, while respecting automated_insertion_limit constraints.
     * 
     * @default false
     */
    use_fractional_swings: z.boolean().optional()
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
    chests: z.array(ChestConfigSchema).optional(),
    overrides: ConfigOverridesSchema.optional()
});

export type Config = z.infer<typeof ConfigSchema>;
