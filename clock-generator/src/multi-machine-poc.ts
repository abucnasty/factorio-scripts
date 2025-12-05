import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { InserterTransferTrackerPlugin } from './control-logic/inserter/plugins/inserter-transfer-tracker-plugin';
import { DebugPluginFactory } from './crafting/sequence/debug-plugins';
import { simulateFromContext } from './crafting/sequence/multi-machine-crafting-sequence';
import { createSimulationContextFromConfig } from './crafting/sequence/simulation-context';
import { InserterTransfer } from './crafting/sequence/single-crafting-sequence';
import { Duration } from './data-types';
import { EntityId, Machine } from './entities';
import { printInserterTransfers } from './generator';

const config: Config = EXAMPLES.ELECTRIC_FURNACE_CONFIG;

const warmup_period: Duration = Duration.ofSeconds(0);
const duration: Duration = Duration.ofSeconds(3);
const debug = true;

const simulation_context = createSimulationContextFromConfig(config);


simulation_context.machines.forEach(it => {
    Machine.printMachineFacts(it.machine_state.machine);
})

const inserter_transfers: Map<EntityId, InserterTransfer[]> = new Map();




console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

console.log(`Warming up simulation for ${warmup_period.ticks} ticks`);
simulateFromContext(simulation_context, warmup_period);
simulation_context.tick_provider.setCurrentTick(0);

console.log(`Starting simulation for ${duration.ticks} ticks`);
// logging
const debug_plugin_factory = new DebugPluginFactory(
    simulation_context.tick_provider,
    {
        enabled: debug
    }
);

simulation_context.inserters.forEach(it => {
    it.addPlugin(debug_plugin_factory.inserterModeChangePlugin(it));
    it.addPlugin(debug_plugin_factory.inserterHandContentsChangePlugin(it));
    it.addPlugin(new InserterTransferTrackerPlugin(simulation_context.tick_provider, it.inserter_state, (snapshot) => {
        const ranges = inserter_transfers.get(it.entity_id) ?? []
        ranges.push({
            item_name: snapshot.item_name,
            tick_range: snapshot.tick_range
        })
        inserter_transfers.set(it.entity_id, ranges);
    }))
});

simulation_context.machines.forEach(it => {
    it.addPlugin(debug_plugin_factory.machineModeChangePlugin(it.machine_state));
    it.addPlugin(debug_plugin_factory.machineCraftEventPlugin(it.machine_state));
});

simulateFromContext(simulation_context, duration);

console.log(`Simulation complete`);

printInserterTransfers(inserter_transfers)
