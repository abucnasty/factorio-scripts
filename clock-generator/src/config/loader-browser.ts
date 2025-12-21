import { parse as parseHocon, HoconParseOptions } from "@pushcorn/hocon-parser";
import { ZodError } from "zod";
import { Config, ConfigSchema } from "./schema";
import { ConfigValidationError } from "./errors";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for parsing HOCON configuration.
 */
export interface ConfigLoaderOptions {
    /**
     * Whether to allow HOCON include directives.
     * 
     * - `true` (default for Node.js): Enables include directives for splitting
     *   large configs across multiple files.
     * - `false` (recommended for browser): Disables includes for security and
     *   because file system access is not available.
     */
    allowIncludes?: boolean;

    /**
     * Base directory for resolving relative include paths.
     * Only used when `allowIncludes` is true.
     */
    basePath?: string;
}

/**
 * Result of a config parse operation that may fail.
 */
export type ConfigParseResult =
    | { success: true; config: Config }
    | { success: false; error: ConfigValidationError };

// ============================================================================
// Core Parsing Functions (Browser-Compatible)
// ============================================================================

/**
 * Parse a HOCON string and validate it against the Config schema.
 * 
 * @param hoconString - The HOCON configuration as a string
 * @param options - Optional parsing options
 * @returns The validated Config object
 * @throws {ConfigValidationError} If the configuration is invalid
 * @throws {Error} If HOCON parsing fails
 * 
 * @example
 * ```typescript
 * const config = await parseConfig(`
 *   target_output {
 *     recipe = "electronic-circuit"
 *     items_per_second = 1.5
 *     machines = 2
 *   }
 *   machines = []
 *   inserters = []
 *   belts = []
 * `);
 * ```
 */
export async function parseConfig(
    hoconString: string,
    options: ConfigLoaderOptions = {}
): Promise<Config> {
    const { allowIncludes = true } = options;

    // Build HOCON parser options
    const hoconOptions: HoconParseOptions = {
        text: hoconString
    };

    // Note: The @pushcorn/hocon-parser uses the `url` option for resolving includes.
    // When parsing from text without includes, we don't need to set it.
    // If includes are needed, the caller should use loadConfigFromFile which
    // handles the file reading and include resolution.

    // Parse HOCON to plain object
    const parsed = await parseHocon(hoconOptions);

    // Validate against schema
    const result = ConfigSchema.safeParse(parsed);

    if (!result.success) {
        throw new ConfigValidationError(result.error);
    }

    return result.data;
}

/**
 * Parse a HOCON string and return a result object instead of throwing.
 * 
 * @param hoconString - The HOCON configuration as a string
 * @param options - Optional parsing options
 * @returns A result object indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = await parseConfigSafe(hoconString);
 * if (result.success) {
 *   console.log(result.config);
 * } else {
 *   console.error(result.error.getFormattedIssues());
 * }
 * ```
 */
export async function parseConfigSafe(
    hoconString: string,
    options: ConfigLoaderOptions = {}
): Promise<ConfigParseResult> {
    try {
        const config = await parseConfig(hoconString, options);
        return { success: true, config };
    } catch (error) {
        if (error instanceof ConfigValidationError) {
            return { success: false, error };
        }
        // Re-wrap other errors (HOCON parse errors) as validation errors
        if (error instanceof ZodError) {
            return { success: false, error: new ConfigValidationError(error) };
        }
        throw error; // Re-throw unexpected errors
    }
}

// ============================================================================
// Browser-Compatible Loader Factory
// ============================================================================

/**
 * Create a config loader for browser environments.
 * 
 * @param fetchFn - Function to fetch file contents (e.g., using fetch API)
 * @returns An object with parse and load functions configured for browser use
 * 
 * @example
 * ```typescript
 * const loader = createBrowserConfigLoader(async (url) => {
 *   const response = await fetch(url);
 *   return response.text();
 * });
 * 
 * const config = await loader.loadFromUrl("/api/config");
 * ```
 */
export function createBrowserConfigLoader(
    fetchFn: (url: string) => Promise<string>
) {
    return {
        /**
         * Parse a HOCON string. Includes are disabled by default in browser.
         */
        async parse(hoconString: string): Promise<Config> {
            return parseConfig(hoconString, { allowIncludes: false });
        },

        /**
         * Parse a HOCON string, returning a result object.
         */
        async parseSafe(hoconString: string): Promise<ConfigParseResult> {
            return parseConfigSafe(hoconString, { allowIncludes: false });
        },

        /**
         * Load config from a URL.
         */
        async loadFromUrl(url: string): Promise<Config> {
            const content = await fetchFn(url);
            return parseConfig(content, { allowIncludes: false });
        },

        /**
         * Load config from a URL, returning a result object.
         */
        async loadFromUrlSafe(url: string): Promise<ConfigParseResult> {
            try {
                const config = await this.loadFromUrl(url);
                return { success: true, config };
            } catch (error) {
                if (error instanceof ConfigValidationError) {
                    return { success: false, error };
                }
                throw error;
            }
        }
    };
}
