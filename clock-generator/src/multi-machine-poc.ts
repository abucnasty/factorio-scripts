import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { InserterTransferTrackerPlugin } from './control-logic/inserter/plugins/inserter-transfer-tracker-plugin';
import { DebugPluginFactory } from './crafting/sequence/debug/debug-plugin-factory';
import { DebugSettingsProvider } from './crafting/sequence/debug/debug-settings-provider';
import { simulateFromContext, simulateUntilAllMachinesAreOutputBlocked } from './crafting/sequence/multi-machine-crafting-sequence';
import { createSimulationContextFromConfig } from './crafting/sequence/simulation-context';
import { InserterTransfer } from './crafting/sequence/single-crafting-sequence';
import { Duration, OpenRange } from './data-types';
import { EntityId, Machine } from './entities';
import { printInserterTransfers } from './generator';

const config: Config = EXAMPLES.ELECTRIC_FURNACE_CONFIG;

const warmup_period: Duration = Duration.ofSeconds(10);
const duration: Duration = Duration.ofSeconds(4);
const debug = DebugSettingsProvider.mutable()

const simulation_context = createSimulationContextFromConfig(config);

simulation_context.machines.forEach(it => {
    Machine.printMachineFacts(it.machine_state.machine);
})


// debug plugins
const debug_plugin_factory = new DebugPluginFactory(
    simulation_context.tick_provider,
    debug
);
simulation_context.machines.forEach(it => {
    it.addPlugin(debug_plugin_factory.machineModeChangePlugin(it.machine_state));
    it.addPlugin(debug_plugin_factory.machineCraftEventPlugin(it.machine_state));
});
simulation_context.inserters.forEach(it => {
    it.addPlugin(debug_plugin_factory.inserterModeChangePlugin(it));
    it.addPlugin(debug_plugin_factory.inserterHandContentsChangePlugin(it));
});

// inserter transfer tracking
const inserter_transfers: Map<EntityId, InserterTransfer[]> = new Map();

let offset_tick = 0;

simulation_context.inserters.forEach(it => {
    it.addPlugin(new InserterTransferTrackerPlugin(simulation_context.tick_provider, it.inserter_state, (snapshot) => {
        const ranges = inserter_transfers.get(it.entity_id) ?? []
        ranges.push({
            item_name: snapshot.item_name,
            tick_range: OpenRange.from(
                snapshot.tick_range.start_inclusive - offset_tick,
                snapshot.tick_range.end_inclusive - offset_tick
            ),
        })
        inserter_transfers.set(it.entity_id, ranges);
    }))
});

// simulation

console.log(`Created simulation context with ${simulation_context.machines.length} machines and ${simulation_context.inserters.length} inserters.`);

console.log("Pre loading all machines until output blocked...");
debug.enable()
simulateUntilAllMachinesAreOutputBlocked(simulation_context);
printInserterTransfers(inserter_transfers)
inserter_transfers.clear();
offset_tick = simulation_context.tick_provider.getCurrentTick();
debug.disable()
console.log("All machines are output blocked. Starting warm up simulation...");

console.log("Warming up simulation...");
const warm_up_start = new Date()
simulateFromContext(simulation_context, warmup_period);
const warm_up_end = new Date();
const warm_up_simulation_time = warm_up_end.getTime() - warm_up_start.getTime();
console.log(`Warm up simulation executed ${warmup_period.ticks} ticks in ${warm_up_simulation_time} ms (${(warmup_period.ticks / (warm_up_simulation_time / 1000)).toFixed(2)} UPS)`);
console.log(`Starting simulation for ${duration.ticks} ticks`);
// logging



simulateFromContext(simulation_context, duration);

console.log(`Simulation complete`);

// printInserterTransfers(inserter_transfers)
