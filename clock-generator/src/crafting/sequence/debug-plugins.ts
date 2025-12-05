import { TickProvider } from "../../control-logic/current-tick-provider";
import { InserterStateMachine } from "../../control-logic/inserter/inserter-state-machine";
import { InserterHandContentsChangePlugin, OnHandContentsChanged } from "../../control-logic/inserter/plugins";
import chalk from "chalk";
import { MachineState, ReadableEntityStateRegistry } from "../../state";
import { ModePlugin } from "../../control-logic/mode";
import { InserterMode } from "../../control-logic/inserter/modes";
import { ActiveInserterTrackerPlugin } from "../../control-logic/inserter/plugins/active-inserter-tracker-plugin";
import { MachineStateMachine } from "../../control-logic/machine/machine-state-machine";
import { MachineMode } from "../../control-logic/machine/modes";
import { CraftEventListenerPlugin } from "../../control-logic/machine/plugins";

export interface DebugPluginConfig {
    enabled?: boolean;
    relative_tick_mod?: number;
}

const debugLog = (tick_provider: TickProvider, config: DebugPluginConfig) => (message: string) => {
    if (!config.enabled) {
        return;
    }
    const tick = tick_provider.getCurrentTick();
    const tickPadded = tick.toString().padStart(4, '0');

    let messageOutput = `Tick ${tickPadded}`

    if (config.relative_tick_mod) {
        const relativeTick = tick % config.relative_tick_mod
        messageOutput += ` (${relativeTick.toString().padStart(3, '0')})`
    }
    messageOutput += `: ${message}`
    console.log(messageOutput);
}



export class DebugPluginFactory {
    constructor(
        private readonly tick_provider: TickProvider,
        private readonly debug_config: DebugPluginConfig,
    ) { }

    private readonly createDebugLog = () => debugLog(this.tick_provider, this.debug_config);


    public inserterHandContentsChangePlugin(inserter_state_machine: InserterStateMachine): InserterHandContentsChangePlugin {
        const debugLog = this.createDebugLog()
        return new InserterHandContentsChangePlugin(inserter_state_machine.inserter_state, (oldContents, newContents) => {
            const id = inserter_state_machine.entity_id;

            if (!newContents) {
                return;
            }

            let message = `${id} \t held_item "${newContents?.item_name}"=${newContents?.quantity}`

            debugLog(chalk.dim(message));
        })
    }

    public inserterModeChangePlugin(inserter_state_machine: InserterStateMachine): ModePlugin<InserterMode> {
        const debugLog = this.createDebugLog()
        return {
            onTransition(fromMode, transition) {
                const id = inserter_state_machine.entity_id;
                const new_status = transition.toMode.status;
                let message = `${id} \t status=${new_status} \t reason="${transition.reason}"`;

                debugLog(chalk.dim(message));
            },
        }
    }


    public machineModeChangePlugin(machine_state: MachineState): ModePlugin<MachineMode> {
        const debugLog = this.createDebugLog()
        return {
            onTransition(fromMode, transition) {
                const id = machine_state.machine.entity_id.id;
                const new_status = transition.toMode.status;
                debugLog(chalk.yellow(`${id} \t ${fromMode.status} -> ${new_status} reason=${transition.reason}`));
            }
        }
    }

    public machineCraftEventPlugin(machine_state: MachineState) {
        const debugLog = this.createDebugLog()
        return new CraftEventListenerPlugin(machine_state, this.tick_provider, ({ craft_ticks, state }) => {
            const id = state.machine.entity_id.id;
            let message = `${id} \t craft event #${machine_state.craftCount}:`;
            state.machine.inputs.forEach((input) => {
                const input_quantity = state.inventoryState.getQuantity(input.ingredient.name);
                message += ` \t "${input.ingredient.name}"=${input_quantity}`;
            });

            const output_quantity = state.inventoryState.getQuantity(state.machine.output.ingredient.name);
            const output_name = state.machine.output.ingredient.name;
            message += ` \t "${output_name}"=${output_quantity}`;
            debugLog(chalk.green(message));
        })
    }


}