import * as path from 'path';

/**
 * Base directory for config sample files.
 */
const CONFIG_SAMPLES_DIR = path.resolve(__dirname, '../../resources/config-samples');

/**
 * Paths to all available config sample files.
 * Use these with `loadConfigFromFile()` to load configurations.
 * 
 * @example
 * ```typescript
 * import { loadConfigFromFile } from './loader';
 * import { ConfigPaths } from './config-paths';
 * 
 * const config = await loadConfigFromFile(ConfigPaths.LOGISTIC_SCIENCE_SHARED_INSERTER);
 * ```
 */
export const ConfigPaths = {
    ADVANCED_CIRCUIT: path.join(CONFIG_SAMPLES_DIR, 'advanced-circuit.conf'),
    CHEMICAL_SCIENCE: path.join(CONFIG_SAMPLES_DIR, 'chemical-science.conf'),
    CHEMICAL_SCIENCE_ADVANCED_CIRCUIT: path.join(CONFIG_SAMPLES_DIR, 'chemical-science-advanced-circuit.conf'),
    CHEMICAL_SCIENCE_DI_ENGINE: path.join(CONFIG_SAMPLES_DIR, 'chemical-science-di-engine.conf'),
    CHEMICAL_SCIENCE_ENGINES: path.join(CONFIG_SAMPLES_DIR, 'chemical-science-engines.conf'),
    ELECTRIC_FURNACE: path.join(CONFIG_SAMPLES_DIR, 'electric-furnace.conf'),
    LOGISTIC_SCIENCE: path.join(CONFIG_SAMPLES_DIR, 'logistic-science.conf'),
    LOGISTIC_SCIENCE_SHARED_INSERTER: path.join(CONFIG_SAMPLES_DIR, 'logistic-science-shared-inserter.conf'),
    PRODUCTION_SCIENCE: path.join(CONFIG_SAMPLES_DIR, 'production-science.conf'),
    PRODUCTION_SCIENCE_SHARED: path.join(CONFIG_SAMPLES_DIR, 'production-science-shared.conf'),
    PRODUCTIVITY_MODULE: path.join(CONFIG_SAMPLES_DIR, 'productivity-module.conf'),
    SAMPLE_CONFIG: path.join(CONFIG_SAMPLES_DIR, 'sample-config.conf'),
    STONE_BRICKS_DIRECT_INSERT: path.join(CONFIG_SAMPLES_DIR, 'stone-bricks-direct-insert.conf'),
    UTILITY_SCIENCE: path.join(CONFIG_SAMPLES_DIR, 'utility-science.conf'),
} as const;

export type ConfigPathKey = keyof typeof ConfigPaths;
