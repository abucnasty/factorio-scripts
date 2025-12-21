import { loadConfigFromFile } from './config/loader';
import { ConfigPaths } from './config/config-paths';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { generateClockForConfig } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";
import { Config } from './config/schema';

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

    const result = generateClockForConfig(config, debug);

    console.log("----------------------");
    console.log(encodeBlueprintFile({
        blueprint: result.blueprint
    }));
}

main().catch(console.error);