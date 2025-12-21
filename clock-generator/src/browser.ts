/**
 * Browser-compatible exports for clock-generator.
 * 
 * This module provides all the necessary exports for using clock-generator
 * in a browser environment, including React applications.
 * 
 * Note: HOCON parsing is NOT available in the browser. Use JSON format instead.
 */

// ============================================================================
// Config Types and Loader
// ============================================================================

export {
    Config,
    ConfigSchema,
    TargetProductionRateConfigSchema,
    MachineConfigurationSchema,
    DrillsConfigSchema,
    MiningDrillConfigSchema,
    InserterConfigSchema,
    BeltConfigSchema,
    ConfigOverridesSchema,
} from './config/schema';

export {
    parseConfigFromObject,
    parseConfigFromObjectSafe,
    parseConfigFromJson,
    parseConfigFromJsonSafe,
    ConfigParseResult,
} from './config/config-browser';

export {
    ConfigValidationError,
    ConfigValidationIssue,
} from './config/errors';

// ============================================================================
// Blueprint Generation
// ============================================================================

export {
    generateClockForConfig,
    BlueprintGenerationResult,
    GenerateClockOptions,
    DebugSteps,
} from './crafting/generate-blueprint';

export {
    encodeBlueprintFileBrowser,
    decodeBlueprintFileBrowser,
} from './blueprints/serde';

export {
    FactorioBlueprint,
    FactorioBlueprintFile,
} from './blueprints/blueprint';

// ============================================================================
// Factorio Data Service
// ============================================================================

export {
    FactorioDataService,
    EnrichedRecipe,
    EnrichedIngredient,
} from './data/factorio-data-service';

export {
    FactorioData,
    Recipe,
    Item,
    Ingredient,
    ItemName,
    RecipeName,
    ResourceName,
    Resource,
    MiningDrillSpec,
} from './data/factorio-data-types';

// ============================================================================
// Debug and Logging
// ============================================================================

export {
    DebugSettingsProvider,
    MutableDebugSettingsProvider,
} from './crafting/sequence/debug/debug-settings-provider';

export {
    Logger,
    ConsoleLogger,
    CollectingLogger,
    StreamingLogger,
    CompositeLogger,
    LogMessage,
    defaultLogger,
} from './common/logger';

// ============================================================================
// Runner Step Types (for debug step configuration)
// ============================================================================

export {
    RunnerStepType,
} from './crafting/runner/steps/runner-step';

// ============================================================================
// Common Types
// ============================================================================

export {
    Duration,
} from './data-types';

// Belt and Mining Drill Types
export {
    BeltType,
    MiningDrillType,
} from './common/entity-types';

// ============================================================================
// Transfer History (for visualization)
// ============================================================================

export {
    SerializableTransferHistory,
    SerializableTransferEntry,
    SerializableEntityTransferHistory,
    serializeTransferHistory,
} from './crafting/sequence/transfer-history-serializer';
