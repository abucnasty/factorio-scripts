import { Config } from "../../config/config";
import { MutableTickProvider } from "../../control-logic/current-tick-provider";
import { AlwaysEnabledControl } from "../../control-logic/enable-control";
import { InserterStateMachine } from "../../control-logic/inserter/inserter-state-machine";
import { MachineStateMachine } from "../../control-logic/machine/machine-state-machine";
import { Belt, EntityRegistry, InserterFactory, Machine } from "../../entities";
import { MiningDrill } from "../../entities/drill/mining-drill";
import { MiningProductivity } from "../../entities/drill/mining-productivity";
import { EntityState, EntityStateFactory, EntityStateRegistry } from "../../state";

export interface SimulationContext {
    tick_provider: MutableTickProvider;
    machines: MachineStateMachine[];
    inserters: InserterStateMachine[];
}

export type MachineStateMachineInterceptor = (entity_state: EntityState) => MachineStateMachine | null
export type InserterStateMachineInterceptor = (entity_state: EntityState) => InserterStateMachine | null

export function createSimulationContextFromConfig(
    config: Config,
    interceptors: {
        machine_interceptor?: MachineStateMachineInterceptor,
        inserter_interceptor?: InserterStateMachineInterceptor,
    } = {}
): SimulationContext {
    const entity_registry = new EntityRegistry();

    const inserter_factory = new InserterFactory(entity_registry);

    config.belts.forEach(beltConfig => {
        entity_registry.add(Belt.fromConfig(beltConfig));
    })

    config.machines.forEach(machineConfig => {
        entity_registry.add(Machine.fromConfig(machineConfig))
    });

    config.inserters.forEach((inserterConfig, index) => {
        entity_registry.add(inserter_factory.fromConfig(index + 1, inserterConfig))
    });

    const drills = config.drills

    if (drills) {
        const mining_productivity = MiningProductivity.fromLevel(drills.mining_productivity_level)
        drills.configs.forEach((drill_config, index) => {
            entity_registry.add(MiningDrill.fromConfig(mining_productivity, drill_config))
        })
    }


    const state_factory = new EntityStateFactory(entity_registry);

    const entity_states = entity_registry.getAll().map(entity => state_factory.createStateForEntity(entity.entity_id))
    const entity_state_registry = new EntityStateRegistry(entity_registry).addStates(entity_states);

    const tick_provider = new MutableTickProvider();

    const machine_state_machines: MachineStateMachine[] = entity_state_registry
        .getAllStates()
        .filter(EntityState.isMachine)
        .map(machine_state => {
            const possible_state_machine = interceptors.machine_interceptor && interceptors.machine_interceptor(machine_state);
            if (possible_state_machine) {
                return possible_state_machine;
            }
            return MachineStateMachine.create({
                machine_state: machine_state,
            });
        })
    
    const inserter_state_machines: InserterStateMachine[] = entity_state_registry
        .getAllStates()
        .filter(EntityState.isInserter)
        .map(inserter_state => {
            const possible_state_machine = interceptors.inserter_interceptor && interceptors.inserter_interceptor(inserter_state);
            if (possible_state_machine) {
                return possible_state_machine;
            }
            return InserterStateMachine.create({
                inserter_state: inserter_state,
                source_state: entity_state_registry.getStateByEntityIdOrThrow(inserter_state.inserter.source.entity_id),
                sink_state: entity_state_registry.getStateByEntityIdOrThrow(inserter_state.inserter.sink.entity_id),
                enable_control: AlwaysEnabledControl,
                tick_provider: tick_provider
            })
        })

    return {
        tick_provider: tick_provider,
        machines: machine_state_machines,
        inserters: inserter_state_machines,
    }
}