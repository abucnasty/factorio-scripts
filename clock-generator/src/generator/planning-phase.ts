import { TickProvider } from "../control-logic/current-tick-provider";
import { AlwaysEnabledControl } from "../control-logic/enable-control";
import { InserterStateMachine } from "../control-logic/inserter/inserter-state-machine";
import { MachineStateMachine } from "../control-logic/machine/machine-state-machine";
import { CraftingSequence } from "../crafting/sequence/single-crafting-sequence";
import { Machine } from "../entities";
import { EntityRegistry } from "../entities/entity-registry";
import { EntityStateRegistry, EntityStateFactory, EntityState } from "../state";

export function planning(
    entityRegistry: EntityRegistry,
    primaryMachine: Machine,
    existingStateRegistry?: EntityStateRegistry,
): CraftingSequence {
    const stateFactory = new EntityStateFactory(entityRegistry);

    const stateRegistry = (existingStateRegistry ?? new EntityStateRegistry(entityRegistry)).addStates(
        entityRegistry.getAll().map(entity => stateFactory.createStateForEntity(entity.entity_id))
    );

    const tick_provider = TickProvider.mutable()
    const stateMachines = stateRegistry.getAllStates()
        .filter(EntityState.isInserter)
        .filter(it => it.inserter.sink.entity_id.id === primaryMachine.entity_id.id)
        .map(it => InserterStateMachine.forInserterId({
            entity_id: it.entity_id,
            entity_state_registry: stateRegistry,
            enable_control: AlwaysEnabledControl,
            tick_provider: tick_provider,
        }));

    const craftingSequence = CraftingSequence.simulate({
        machine_state_machine: MachineStateMachine.forMachineId(primaryMachine.entity_id, stateRegistry),
        inserterStateMachines: stateMachines,
        tickProvider: tick_provider,
        debug: {
            enabled: true,
        }
    });

    return craftingSequence;
}