import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { CraftingSequence, InserterTransfer } from './crafting/sequence/single-crafting-sequence';
import assert from 'assert';
import {
    Belt,
    BeltRegistry,
    EntityId,
    EntityRegistry,
    InserterFactory,
    InserterRegistry,
    Machine,
    MachineRegistry,
} from './entities';
import {
    EntityStateRegistry,
    EntityStateFactory,
    EntityState,
} from './state';
import { Duration } from './data-types';
import { AlwaysEnabledControl, EnableControl } from './control-logic/enable-control';
import { TickProvider } from './control-logic/current-tick-provider';
import { encodeBlueprintFile } from './blueprints/serde';
import { TargetProductionRate } from './crafting/target-production-rate';
import { InserterStateMachine } from './control-logic/inserter/inserter-state-machine';
import chalk from 'chalk';
import { MachineStateMachine } from './control-logic/machine/machine-state-machine';
import { createInserterControlLogicFromActiveRanges, createSignalPerInserterBlueprint } from './crafting/blueprint';
import { createInputInserterControlLogicFromPlan, createOutputInserterControlLogicFromPlan, planning, printCraftingSequence, printCraftingStatistics, printCraftSnapshots, printInserterActiveRanges, printInserterTransfers, refinement, testing, TestingPhaseScope } from './generator';
import { FactorioBlueprint } from './blueprints/blueprint';


const config: Config = EXAMPLES.LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG;

// TODO: figure out a way to compute the total number of periods to simulate...
// for utility science, 12 seems stable
// for logistics science, 1 period is stable
const STARTUP_MULITPLIER = 8;
const SIMULATOR_MULTIPLIER = 1;
const DEBUG = false;
const USE_ACTIVE_RANGES = true;

const main = () => {
    const entityRegistry = new EntityRegistry();
    const machineRegistry = new MachineRegistry(entityRegistry);
    const inserterRegistry = new InserterRegistry(entityRegistry);
    const inserterFactory = new InserterFactory(entityRegistry);


    config.belts.forEach(beltConfig => {
        entityRegistry.add(Belt.fromConfig(beltConfig));
    })

    config.machines.forEach(machineConfig => {
        entityRegistry.add(Machine.fromConfig(machineConfig))
    });

    config.inserters.forEach((inserterConfig, index) => {
        entityRegistry.add(inserterFactory.fromConfig(index + 1, inserterConfig))
    });

    const primaryMachine = machineRegistry.getMachineByRecipeOrThrow(config.target_output.recipe);

    Machine.printMachineFacts(primaryMachine);

    const inserters = inserterRegistry.getInsertersForMachine(primaryMachine.entity_id)

    const outputInserter = inserters.find(inserter => {
        return inserter.source.entity_id.id === primaryMachine.entity_id.id;
    });

    assert(outputInserter != undefined, `No output inserter found for primary machine with id ${primaryMachine.entity_id}`);


    const target_production_rate = TargetProductionRate.fromConfig(config.target_output);

    const stateFactory = new EntityStateFactory(entityRegistry);

    const planning_state_registry = new EntityStateRegistry(entityRegistry).addStates(
        entityRegistry.getAll().map(entity => stateFactory.createStateForEntity(entity.entity_id))
    );

    const planningSequence = planning(
        entityRegistry,
        primaryMachine,
        planning_state_registry
    );

    console.log(chalk.green("Planning Phase Complete:"));
    printCraftingStatistics(planningSequence);
    // printCraftSnapshots(planningSequence)


    // output inserter is going to be throttled to only pull out items at a fixed rate
    const tickProvider = TickProvider.mutable();

    const { enableControl: output_enable_control, totalPeriod: crafting_period } = createOutputInserterControlLogicFromPlan(
        planningSequence,
        outputInserter,
        tickProvider,
        target_production_rate
    );

    const inputInserterEnableControl: Map<EntityId, EnableControl> = new Map();

    const testing_state_registry = new EntityStateRegistry(entityRegistry).addStates(
        entityRegistry.getAll().map(entity => stateFactory.createStateForEntity(entity.entity_id))
    );

    inserters.filter(inserter => inserter.entity_id.id !== outputInserter.entity_id.id).forEach(inputInserter => {
        const enableControl = createInputInserterControlLogicFromPlan(
            planningSequence,
            inputInserter,
            tickProvider,
            crafting_period,
            output_enable_control
        );
        inputInserterEnableControl.set(
            inputInserter.entity_id,
            enableControl,
        );
    });

    const test = (ticks: number, debug: boolean) => {
        const scope = TestingPhaseScope.create(
            entityRegistry,
            primaryMachine,
            inputInserterEnableControl,
            output_enable_control,
            tickProvider,
            testing_state_registry,
        );
        tickProvider.setCurrentTick(0);
        return testing(
            scope,
            ticks,
            crafting_period,
            debug
        );
    }

    const maxTicks = crafting_period.ticks * SIMULATOR_MULTIPLIER

    // try to get to steady state
    const startupSequence = test(crafting_period.ticks * STARTUP_MULITPLIER, false)
    const testCraftingSequence = test(maxTicks, DEBUG);

    console.log("------------------------------")
    console.log(chalk.green("Testing Phase Complete:"));
    printCraftingStatistics(testCraftingSequence);


    console.log(chalk.yellow("Beginning Refinement Phase:"));
    const finalCraftingSequence = refinement({
        entityRegistry: entityRegistry,
        testSequence: testCraftingSequence,
        planSequence: planningSequence,
        targetProductionRate: target_production_rate,
        outputInserterId: outputInserter.entity_id,
        total_period: Duration.ofTicks(maxTicks),
    });

    console.log("------------------------------")
    console.log(chalk.green("Refinement Phase Complete:"));
    printCraftingStatistics(finalCraftingSequence);
    printInserterTransfers(finalCraftingSequence.inserter_transfers, crafting_period.ticks);
    printInserterActiveRanges(finalCraftingSequence.inserter_active_ranges, entityRegistry, crafting_period.ticks);

    let blueprint: FactorioBlueprint | null = null;

    if (USE_ACTIVE_RANGES) {
        blueprint = createInserterControlLogicFromActiveRanges(
            finalCraftingSequence,
            entityRegistry
        )
    } else {
        blueprint = createSignalPerInserterBlueprint(
            primaryMachine.output.item_name,
            finalCraftingSequence.total_duration,
            finalCraftingSequence.inserter_transfers,
            entityRegistry
        )
    }

    console.log("----------------------")
    console.log(encodeBlueprintFile({
        blueprint: blueprint
    }))

    return;
}

main()