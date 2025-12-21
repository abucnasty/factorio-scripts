import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { generateClockForConfig } from './crafting/generate-blueprint';
import { encodeBlueprintFile } from "./blueprints/serde";

const config: Config = EXAMPLES.LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG;

const debug = DebugSettingsProvider.mutable();

const result = generateClockForConfig(config, debug);

console.log("----------------------");
console.log(encodeBlueprintFile({
    blueprint: result.blueprint
}));