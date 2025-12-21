declare module "@pushcorn/hocon-parser" {
    export interface HoconParseOptions {
        /**
         * The HOCON text to parse.
         */
        text?: string;

        /**
         * URL for resolving includes. When set, the parser can resolve
         * relative include paths from this base URL.
         */
        url?: string;

        /**
         * Custom environment variables to use for substitutions.
         */
        env?: Record<string, string>;
    }

    /**
     * Parse a HOCON configuration.
     * 
     * @param options - Parsing options including text or URL
     * @returns A promise that resolves to the parsed configuration object
     */
    export function parse(options: HoconParseOptions): Promise<unknown>;

    /**
     * Parse a HOCON configuration synchronously.
     * 
     * @param options - Parsing options including text
     * @returns The parsed configuration object
     */
    export function parseSync(options: HoconParseOptions): unknown;
}
