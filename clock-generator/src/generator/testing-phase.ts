import assert from "assert";
import { MutableTickProvider, TickProvider } from "../control-logic/current-tick-provider";
import { EnableControl, AlwaysEnabledControl, createPeriodicEnableControl, PeriodicEnableControl } from "../control-logic/enable-control";
import { InserterStateMachine } from "../control-logic/inserter/inserter-state-machine";
import { MachineStateMachine } from "../control-logic/machine/machine-state-machine";
import { CraftingSequence } from "../crafting/crafting-sequence";
import { Duration, OpenRange } from "../data-types";
import { EntityRegistry, Machine, EntityId, Inserter } from "../entities";
import { ReadableEntityStateRegistry, EntityStateFactory, EntityStateRegistry, EntityState } from "../state";
import { TargetProductionRate } from "../crafting/target-production-rate";
import { fraction } from "fractionability";


export interface TestingPhaseScope {
    machine_state_machine: MachineStateMachine;
    inserter_state_machines: InserterStateMachine[];
    tick_provider: MutableTickProvider;
}

function createTestingPhaseScope(
    entityRegistry: EntityRegistry,
    primaryMachine: Machine,
    inputInserterEnableControl: Map<EntityId, EnableControl>,
    outputInserterEnableControl: EnableControl,
    tickProvider: MutableTickProvider,
    existingStateRegistry?: ReadableEntityStateRegistry,
): TestingPhaseScope {

    const stateFactory = new EntityStateFactory(entityRegistry);

    const stateRegistry: ReadableEntityStateRegistry = (existingStateRegistry ?? new EntityStateRegistry(entityRegistry).addStates(
        entityRegistry.getAll().map(entity => stateFactory.createStateForEntity(entity.entity_id))
    ));

    const inputInserterControlLogic = stateRegistry.getAllStates()
        .filter(EntityState.isInserter)
        .filter(it => it.inserter.sink.entity_id.id === primaryMachine.entity_id.id)
        .map(it => InserterStateMachine.forInserterId({
            entity_id: it.entity_id,
            entity_state_registry: stateRegistry,
            enable_control: inputInserterEnableControl.get(it.inserter.entity_id) ?? AlwaysEnabledControl,
            tick_provider: tickProvider,
        }));

    const outputInserter = stateRegistry.getAllStates()
        .filter(EntityState.isInserter)
        .find(it => it.inserter.source.entity_id.id === primaryMachine.entity_id.id);

    assert(outputInserter != undefined, `No output inserter state found for primary machine with id ${primaryMachine.entity_id}`);

    const outputInserterControlLogic = InserterStateMachine.forInserterId({
        entity_id: outputInserter.inserter.entity_id,
        entity_state_registry: stateRegistry,
        enable_control: outputInserterEnableControl,
        tick_provider: tickProvider,
    });

    return {
        machine_state_machine: MachineStateMachine.forMachineId(primaryMachine.entity_id, stateRegistry),
        inserter_state_machines: inputInserterControlLogic.concat([outputInserterControlLogic]),
        tick_provider: tickProvider,
    };
}

export const TestingPhaseScope = {
    create: createTestingPhaseScope,
}

export function testing(
    testing_phase_scope: TestingPhaseScope,
    maxTicks: number,
    totalPeriod: Duration,
    debug?: boolean,
): CraftingSequence {
    const {
        machine_state_machine,
        inserter_state_machines,
        tick_provider,
    } = testing_phase_scope;

    const craftingSequence = CraftingSequence.simulate({
        machine_state_machine: machine_state_machine,
        inserterStateMachines: inserter_state_machines,
        tickProvider: tick_provider,
        maxTicks: maxTicks,
        debug: {
            enabled: debug,
            relative_tick_mod: totalPeriod.ticks
        }
    });

    return craftingSequence;
}

export function createOutputInserterControlLogicFromPlan(
    craftingSequence: CraftingSequence,
    outputInserter: Inserter,
    tickProvider: TickProvider,
    targetProductionRate: TargetProductionRate
): {
    enableControl: PeriodicEnableControl,
    totalPeriod: Duration,
    totalSwings: number,
} {
    const machine = craftingSequence.craft_events[0].machine_state.machine;

    const craftingSequenceDuration = craftingSequence.total_duration.ticks

    const output_crafted = craftingSequence.craft_events[craftingSequence.craft_events.length - 1].machine_state.inventoryState
        .getQuantity(targetProductionRate.machine_production_rate.item);

    const max_swings_possible = fraction(output_crafted).divide(outputInserter.metadata.stack_size)
    const max_output_possible = max_swings_possible.multiply(outputInserter.metadata.stack_size)
    const required_output = targetProductionRate.machine_production_rate.rate_per_tick.multiply(craftingSequenceDuration)

    console.log(`Output Inserter ${outputInserter.entity_id} can perform a maximum of ${max_swings_possible.toDecimal()} swings over ${craftingSequenceDuration} ticks.`)

    // assert(
    //     required_output.toDecimal() <= max_output_possible.toDecimal(),
    //     `The current inserter setup cannot sustain the target output rate. ` + 
    //     `Required output over the crafting sequence is ${required_output.toDecimal()} ` + 
    //     `but maximum possible output is ${max_output_possible.toDecimal()}`
    // );

    const total_period_ticks = max_output_possible.divide(targetProductionRate.machine_production_rate.rate_per_tick)

    assert(total_period_ticks.getDenominator === 1, `The total period ticks must be a whole number, got ${total_period_ticks.toString()}`)

    const total_period = Duration.ofTicks(total_period_ticks.toDecimal());

    const swing_duration = max_swings_possible
        .multiply(outputInserter.animation.total.ticks)
        .toDecimal()

    // buffer for handling out of sync machine crafts
    const buffer = Math.floor(machine.crafting_rate.ticks_per_craft)

    const enabledRange = OpenRange.from(
        0,
        swing_duration + buffer,
    )

    console.log(`Output Inserter Control Logic Period: ${total_period.ticks} ticks, Enabled Range: ${enabledRange}`)

    return {
        enableControl: createPeriodicEnableControl({
            periodDuration: Duration.ofTicks(total_period.ticks),
            enabledRanges: [enabledRange],
            tickProvider: tickProvider
        }),
        totalPeriod: total_period,
        totalSwings: max_swings_possible.toDecimal(),
    }
}


export function createInputInserterControlLogicFromPlan(
    craftingSequence: CraftingSequence,
    inputInserter: Inserter,
    tickProvider: TickProvider,
    totalPeriod: Duration,
    outputInserterEnableControl: PeriodicEnableControl
): PeriodicEnableControl {
    const inserterActiveRanges = craftingSequence.inserter_transfers!.get(inputInserter.entity_id);

    const machine = craftingSequence.craft_events[0].machine_state.machine;

    assert(inserterActiveRanges != undefined, `No active ranges found for input inserter with id ${inputInserter.entity_id}`);

    const transfers = craftingSequence.inserter_transfers.get(inputInserter.entity_id);
    assert(transfers != undefined, `No active ranges found for input inserter with id ${inputInserter.entity_id}`);

    const buffer = Math.ceil(machine.crafting_rate.ticks_per_craft)

    const start_offset = outputInserterEnableControl.enabledRanges[0].end_inclusive + 1;
    const range = OpenRange.from(
        start_offset,
        totalPeriod.ticks,
    );

    console.log(`Input Inserter ${inputInserter.entity_id} Control Logic Period: ${totalPeriod.ticks} ticks, Enabled Ranges:`);
    console.log(`- [${range.start_inclusive} - ${range.end_inclusive}]`);

    return createPeriodicEnableControl({
        periodDuration: Duration.ofTicks(totalPeriod.ticks),
        enabledRanges: [range],
        tickProvider: tickProvider
    });

}