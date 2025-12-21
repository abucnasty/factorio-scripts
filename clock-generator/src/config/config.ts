/**
 * Configuration types for Factorio clock generator.
 * 
 * All types are derived from Zod schemas in schema.ts for runtime validation.
 * This file re-exports them for backwards compatibility.
 */

// Re-export entity type constants
export { BeltType } from "../common/entity-types";

// Re-export all types from schema (Zod-derived)
export type {
    RecipeName,
    ItemName,
    ResourceName,
    MachineConfiguration,
    TargetProductionRateConfig,
    DrillTargetMachineConfig,
    MiningDrillConfig,
    DrillsConfig,
    InserterBeltConfig,
    InserterMachineConfig,
    InserterAnimationOverrideConfig,
    InserterConfig,
    InserterStackSizeConfig,
    InserterFilterConfig,
    BeltLaneConfig,
    BeltConfig,
    ConfigOverrides,
    Config
} from "./schema";

// Re-export schemas for programmatic access
export {
    MachineConfigurationSchema,
    TargetProductionRateConfigSchema,
    DrillTargetMachineConfigSchema,
    MiningDrillConfigSchema,
    DrillsConfigSchema,
    InserterBeltConfigSchema,
    InserterMachineConfigSchema,
    InserterAnimationOverrideConfigSchema,
    InserterConfigSchema,
    BeltLaneConfigSchema,
    BeltConfigSchema,
    ConfigOverridesSchema,
    ConfigSchema
} from "./schema";