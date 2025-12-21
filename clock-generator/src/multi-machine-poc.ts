import { loadConfigFromFile } from './config/loader';
import { ConfigPaths } from './config/config-paths';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { generateClockForConfig } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";
import { Config } from './config/schema';

async function main() {
    const config: Config = await loadConfigFromFile(
        ConfigPaths.CHEMICAL_SCIENCE_ADVANCED_CIRCUIT
    );

    const debug = DebugSettingsProvider.mutable();

    const result = generateClockForConfig(config, debug);

    console.log("----------------------");
    console.log(encodeBlueprintFile({
        blueprint: result.blueprint
    }));
}

main().catch(console.error);