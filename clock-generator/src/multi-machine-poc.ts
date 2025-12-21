import { loadConfigFromFile } from './config/loader';
import { ConfigPaths } from './config/config-paths';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { generateClockForConfig, GenerateClockOptions } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";
import { Config } from './config/schema';
import { RunnerStepType } from './crafting/runner';
import fs from 'fs/promises'

/**
 * utility function to quickly convert all HOCON configs to JSON files
 */
async function saveAllHoconConfigsToJson() {
    for(const config_path of Object.values(ConfigPaths)) {
        console.log(`Loading config from: ${config_path}`)
        const config: Config = await loadConfigFromFile(config_path);

        const json_file_path = `${config_path.replace('.conf', '.json')}`
        await fs.writeFile(
            json_file_path,
            JSON.stringify(config, null, 2),
            "utf-8"
        );
        console.log(`Saved loaded config to ${json_file_path}`);
    }
}

async function main() {
    const config: Config = await loadConfigFromFile(
        ConfigPaths.STONE_BRICKS_DIRECT_INSERT
    );
    console.log("Loaded config:");
    console.log("----------------------");
    console.log(JSON.stringify(config));
    console.log("----------------------");

    const debug = DebugSettingsProvider.mutable();
    debug.setSettings({
        plugin_settings: {
            craft_event: {
                print_bonus_progress: false,
                print_craft_progress: false,
            }
        }
    })
    const options: GenerateClockOptions = {
        // Define which steps to enable debug logging for
        debug_steps: {
            [RunnerStepType.PREPARE]: false,
            [RunnerStepType.WARM_UP]: false,
            [RunnerStepType.SIMULATE]: false
        },
        debug: debug
    };

    const result = generateClockForConfig(config, options);

    console.log("----------------------");
    console.log(encodeBlueprintFile({
        blueprint: result.blueprint
    }));
}

main().catch(console.error);