import { loadConfigFromFile } from './config/loader';
import { ConfigPaths } from './config/config-paths';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { DebugSteps, generateClockForConfig } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";
import { Config } from './config/schema';
import { RunnerStepType } from './crafting/runner';

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

    // Define which steps to enable debug logging for
    const debug_steps: DebugSteps = {
        [RunnerStepType.PREPARE]: false,
        [RunnerStepType.WARM_UP]: false,
        [RunnerStepType.SIMULATE]: false
    }

    const result = generateClockForConfig(
        config,
        debug,
        debug_steps
    );

    console.log("----------------------");
    console.log(encodeBlueprintFile({
        blueprint: result.blueprint
    }));
}

main().catch(console.error);