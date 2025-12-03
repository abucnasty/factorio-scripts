import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { CraftingSequence, InserterTransfer } from './crafting/crafting-sequence';
import assert from 'assert';
import {
    Belt,
    BeltRegistry,
    EntityId,
    EntityRegistry,
    Inserter,
    InserterFactory,
    InserterRegistry,
    Machine,
    MachineRegistry,
    ReadableEntityRegistry,
} from './entities';
import {
    EntityStateRegistry,
    EntityStateFactory,
    EntityState,
    ReadableEntityStateRegistry,
} from './state';
import { MachineControlLogic } from './control-logic/machine-control-logic';
import { fraction } from 'fractionability';
import { Duration, OpenRange } from './data-types';
import { AlwaysEnabledControl, createPeriodicEnableControl, EnableControl, PeriodicEnableControl } from './control-logic/enable-control';
import { MutableTickProvider, TickProvider } from './control-logic/current-tick-provider';
import { DeciderCombinatorEntity } from './blueprints/entity/decider-combinator';
import { Position, SignalId } from './blueprints/components';
import { FactorioBlueprint, BlueprintBuilder } from './blueprints/blueprint';
import { encodeBlueprintFile } from './blueprints/serde';
import { TargetProductionRate } from './crafting/target-production-rate';
import { InserterStateMachine } from './control-logic/inserter/inserter-state-machine';
import chalk from 'chalk';


const config: Config = EXAMPLES.LOGISTIC_SCIENCE_SHARED_INSERTER_CONFIG;
const DEBUG = true;

const main = () => {
    const entityRegistry = new EntityRegistry();
    const machineRegistry = new MachineRegistry(entityRegistry);
    const inserterRegistry = new InserterRegistry(entityRegistry);
    const beltRegistry = new BeltRegistry(entityRegistry);
    const inserterFactory = new InserterFactory(machineRegistry, beltRegistry);


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

    /**
     * there should be a planning phase where we first test what the current configuration is capable of producing while not pulling any items
     * out of the machine. This will give us a baseline of what the machine can produce with the current inserter setup.
     * 
     * Once we know the amount it can craft, we will have a craft count and a start and end duration which we can phase match with the
     * desired output rate of the machine.
     * 
     * This will allow us to manually control the output inserter and schedule it to only pull out items at the desired rate, but keep
     * in mind the time to insert and the time it takes for the machine to actually have the items ready to be pulled out.
     * 
     * We also need to consider the fact that we want to avoid the last craft being output blocked.
     * 
     * If there are remaining items in the machine at the end of the cycle, we will need to account for how many total cycles it would take to return back to the original empty state.
     * 
     * This is relatively easy to calculate since we know the input ratios due to the machine recipe. 
     * 
     * So the number of crafting sequences we will need to run to get back to the original state is the least common multiple of all input quantities and output per craft (including productivity).
     * 
     * The output swings count should be configurable and we should work backwards in the planned crafting cycle to determine the exact point when we should start pulling out items.
     * 
     * This should be the tick of the final craft the duration of the output inserter pulling items out of the machine for the given number of swings.
     * 
     * The starting tick though we need to inspect the state of the machine at that time to ensure there are at least the stack size of the inserter available to be pulled out.
     */

    const stateFactory = new EntityStateFactory(entityRegistry);

    const stateRegistry = new EntityStateRegistry(entityRegistry).addStates(
        entityRegistry.getAll().map(entity => stateFactory.createStateForEntity(entity.entity_id))
    );

    const planningSequence = planning(
        entityRegistry,
        primaryMachine,
        stateRegistry
    );

    console.log(chalk.green("Planning Phase Complete:"));
    printCraftingSequence(planningSequence, entityRegistry);
    printCraftSnapshots(planningSequence)


    // output inserter is going to be throttled to only pull out items at a fixed rate

    const tickProvider = TickProvider.mutable();

    const { enableControl: output_enable_control, totalPeriod } = createOutputInserterControlLogicFromPlan(
        planningSequence,
        outputInserter,
        tickProvider,
        target_production_rate
    );

    const inputInserterEnableControl: Map<EntityId, EnableControl> = new Map();

    inserters.filter(inserter => inserter.entity_id.id !== outputInserter.entity_id.id).forEach(inputInserter => {
        const enableControl = createInputInserterControlLogicFromPlan(
            planningSequence,
            inputInserter,
            tickProvider,
            totalPeriod,
            output_enable_control
        );
        inputInserterEnableControl.set(
            inputInserter.entity_id,
            enableControl,
        );
    });


    // TODO: figure out a way to compute the total number of periods to simulate...
    // for utility science, 12 seems stable
    // for logistics science, 1 period is stable
    const multiplier = 6;
    const maxTicks = totalPeriod.ticks * multiplier

    const testCraftingSequence = testing(
        entityRegistry,
        primaryMachine,
        inputInserterEnableControl,
        output_enable_control,
        tickProvider,
        maxTicks,
        totalPeriod,
        stateRegistry
    );

    const finalCraftingSequence = refinement({
        entityRegistry: entityRegistry,
        testSequence: testCraftingSequence,
        planSequence: planningSequence,
        targetProductionRate: target_production_rate,
        outputInserterId: outputInserter.entity_id,
        total_period: Duration.ofTicks(maxTicks),
    });

    printCraftingSequence(
        finalCraftingSequence,
        entityRegistry,
        totalPeriod.ticks
    );

    const blueprint = createBlueprintFromCraftingSequence(
        finalCraftingSequence,
        entityRegistry
    )

    console.log("----------------------")
    console.log(encodeBlueprintFile({
        blueprint: blueprint
    }))

    return;
}

function planning(
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
        machineControlLogic: new MachineControlLogic(
            stateRegistry.getStateByEntityIdOrThrow(primaryMachine.entity_id),
        ),
        inserterStateMachines: stateMachines,
        tickProvider: tick_provider,
        debug: {
            enabled: true,
        }
    });

    return craftingSequence;
}

function createInputInserterControlLogicFromPlan(
    craftingSequence: CraftingSequence,
    inputInserter: Inserter,
    tickProvider: TickProvider,
    totalPeriod: Duration,
    outputInserterEnableControl: PeriodicEnableControl
): PeriodicEnableControl {
    const inserterActiveRanges = craftingSequence.inserter_active_ranges!.get(inputInserter.entity_id);

    const machine = craftingSequence.craft_events[0].machine_state.machine;

    assert(inserterActiveRanges != undefined, `No active ranges found for input inserter with id ${inputInserter.entity_id}`);

    const transfers = craftingSequence.inserter_active_ranges.get(inputInserter.entity_id);
    assert(transfers != undefined, `No active ranges found for input inserter with id ${inputInserter.entity_id}`);

    const buffer = Math.ceil(machine.crafting_rate.ticks_per_craft.toDecimal())

    const start_offset = outputInserterEnableControl.enabledRanges[0].end_inclusive - 1;
    const offset_ranges = transfers.map(transfer => {
        const start_mod = transfer.tick_range.start_inclusive + start_offset;
        const end_mod = transfer.tick_range.end_inclusive + start_offset + buffer;
        return OpenRange.from(
            start_mod,
            totalPeriod.ticks,
        );
    });

    console.log(`Input Inserter ${inputInserter.entity_id} Control Logic Period: ${totalPeriod.ticks} ticks, Enabled Ranges:`);
    offset_ranges.forEach(range => {
        console.log(`- [${range.start_inclusive} - ${range.end_inclusive}]`);
    })

    return createPeriodicEnableControl({
        periodDuration: Duration.ofTicks(totalPeriod.ticks),
        enabledRanges: offset_ranges,
        tickProvider: tickProvider
    });

}

function createOutputInserterControlLogicFromPlan(
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
    const buffer = Math.floor(machine.crafting_rate.ticks_per_craft.toDecimal())

    const enabledRange = OpenRange.from(
        0,
        swing_duration + buffer - 1,
    )

    console.log(`Output Inserter Control Logic Period: ${total_period.ticks} ticks, Enabled Range: [${enabledRange.start_inclusive} - ${enabledRange.end_inclusive}]`)

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

function testing(
    entityRegistry: EntityRegistry,
    primaryMachine: Machine,
    inputInserterEnableControl: Map<EntityId, EnableControl>,
    outputInserterEnableControl: EnableControl,
    tickProvider: MutableTickProvider,
    maxTicks: number,
    totalPeriod: Duration,
    existingStateRegistry?: ReadableEntityStateRegistry,
): CraftingSequence {
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

    const craftingSequence = CraftingSequence.simulate({
        machineControlLogic: new MachineControlLogic(
            stateRegistry.getStateByEntityIdOrThrow(primaryMachine.entity_id),
        ),
        inserterStateMachines: inputInserterControlLogic.concat([outputInserterControlLogic]),
        tickProvider: tickProvider,
        maxTicks: maxTicks,
        debug: {
            enabled: DEBUG,
            relative_tick_mod: totalPeriod.ticks
        }
    });

    return craftingSequence;
}

function refinement(args: {
    entityRegistry: EntityRegistry,
    testSequence: CraftingSequence,
    planSequence: CraftingSequence,
    targetProductionRate: TargetProductionRate,
    outputInserterId: EntityId,
    total_period: Duration,
}): CraftingSequence {

    const { testSequence, planSequence, targetProductionRate, outputInserterId, total_period, entityRegistry } = args;

    const outputMachine = testSequence.craft_events[0].machine_state.machine;

    const output_inserter: Inserter = entityRegistry.getEntityByIdOrThrow(outputInserterId)

    const finalCraftingSequence: CraftingSequence = {
        ...testSequence,
        total_duration: total_period,
    }

    const refined_transfers = new Map<EntityId, InserterTransfer[]>();
    const ticks_per_craft = outputMachine.crafting_rate.ticks_per_craft;

    let output_buffer = Math.ceil(output_inserter.animation.total.ticks / 2);

    finalCraftingSequence.inserter_active_ranges.forEach((transfers, inserterId) => {
        
        if (inserterId.id === output_inserter.entity_id.id) {
            refined_transfers.set(inserterId, transfers.map(transfer => ({
                item_name: transfer.item_name,
                tick_range: OpenRange.from(
                    transfer.tick_range.start_inclusive,
                    transfer.tick_range.end_inclusive + output_buffer,
                )
            })));
            return;
        }

        const refined_transfer = transfers.map(transfer => ({
            item_name: transfer.item_name,
            tick_range: OpenRange.from(
                transfer.tick_range.start_inclusive,
                transfer.tick_range.end_inclusive,
            )
        }))

        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(inserterId);

        const last_transfer = refined_transfer[refined_transfer.length - 1];

        last_transfer.tick_range = OpenRange.from(
            last_transfer.tick_range.start_inclusive,
            last_transfer.tick_range.end_inclusive,
        ) 


        refined_transfers.set(inserterId, refined_transfer);
    })



    const output_inserter_active_transfers = finalCraftingSequence.inserter_active_ranges.get(output_inserter.entity_id)
    assert(output_inserter_active_transfers != undefined, `No active transfers found for output inserter with id ${output_inserter.entity_id}`);

    finalCraftingSequence.inserter_active_ranges = refined_transfers;

    const first_craft = finalCraftingSequence.craft_events[0];
    const final_craft = finalCraftingSequence.craft_events[finalCraftingSequence.craft_events.length - 1];


    console.log(`Refined crafting sequence:`)
    console.log(`- [${first_craft.craft_index}, ${final_craft.craft_index}] crafts`)
    console.log(`- Total crafts in cycle: ${final_craft.craft_index - first_craft.craft_index}`);

    return finalCraftingSequence
}

function printCraftSnapshots(craftingSequence: CraftingSequence) {
    console.log("------------------------------")
    console.log("craft snapshots:")
    craftingSequence.craft_events.forEach((craft) => {
        console.log(`Craft ${craft.craft_index}:`);
        console.log(`- Craft Progress: ${craft.machine_state.craftingProgress.progress.toMixedNumber()}`);
        console.log(`- Bonus Progress: ${craft.machine_state.bonusProgress.progress.toMixedNumber()}`);
        console.log(`- Tick Range: [${craft.tick_range.start_inclusive}, ${craft.tick_range.end_inclusive}]`);
        console.log(`- Machine Status: ${craft.machine_state.status}`);
        craft.machine_state.inventoryState.getAllItems().forEach((item) => {
            console.log(`  - Inventory: ${item.item_name} = ${item.quantity}`);
        })
    })
    console.log("------------------------------")
}

function printCraftingSequence(
    craftingSequence: CraftingSequence,
    entityRegistry: EntityRegistry,
    relative_tick_mod: number = 0
) {
    const machine = craftingSequence.craft_events[craftingSequence.craft_events.length - 1].machine_state.machine;
    const crafts_completed = craftingSequence.craft_events.length;
    const total_crafted = machine.output.amount_per_craft.toDecimal() * crafts_completed;
    console.log("------------------------------")
    console.log(`Crafted ${total_crafted} ${config.target_output.recipe}`);
    console.log(`Simulated ${crafts_completed} crafts over ${craftingSequence.total_duration.ticks} ticks`);
    console.log(`Average items per second: ${(total_crafted / (craftingSequence.total_duration.seconds)).toFixed(2)}`);
    console.log("------------------------------")
    craftingSequence.inserter_active_ranges!.forEach((transfers, entityId) => {
        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(entityId);
        const items = Array.from(inserter.filtered_items).join(", ");
        console.log(`Inserter Active Ranges for ${entityId} ${items}`);
        transfers.forEach((transfer) => {
            const start_inclusive = transfer.tick_range.start_inclusive;
            const end_inclusive = transfer.tick_range.end_inclusive;
            if(relative_tick_mod > 0) {
                const start_mod = start_inclusive % relative_tick_mod;
                const end_mod = end_inclusive % relative_tick_mod;
                console.log(`- [${start_inclusive} - ${end_inclusive}](${start_mod} - ${end_mod}) (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
                return;
            }
            console.log(`- [${start_inclusive} - ${end_inclusive}] (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
        })
    })
}



function createBlueprintFromCraftingSequence(
    craftingSequence: CraftingSequence,
    entityRegistry: ReadableEntityRegistry
): FactorioBlueprint {
    const machine = craftingSequence.craft_events[0].machine_state.machine;
    let x = 0.5;
    const totalClockTicks = craftingSequence.total_duration.ticks;
    const clock = DeciderCombinatorEntity
        .clock(totalClockTicks, 1)
        .setPosition(Position.fromXY(x, 0))
        .build();

    const deciderCombinatorEntities: DeciderCombinatorEntity[] = []

    craftingSequence.inserter_active_ranges.forEach((transfers, entityId) => {
        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(entityId)
        const inserter_number = entityId.id.split(":")[1]
        let outputSignalId = SignalId.virtual(`signal-${inserter_number}`);
        x += 1;

        let description_lines: string[] = []

        description_lines.push(`Inserter ${inserter_number} for: `)
        inserter.filtered_items.forEach(item_name => {
            const item_icon = SignalId.toDescriptionString(SignalId.item(item_name))
            description_lines.push(`- ${item_icon}`)
        })

        const swing_count = transfers.length

        description_lines.push("")
        description_lines.push(`Total Swings: ${swing_count}`)

        if (inserter.filtered_items.size === 1) {
            outputSignalId = SignalId.item(Array.from(inserter.filtered_items)[0])
        }

        const ranges = OpenRange.reduceRanges(transfers.map(transfer => transfer.tick_range));

        const deciderCombinator = DeciderCombinatorEntity
            .fromRanges(
                SignalId.clock,
                ranges,
                outputSignalId
            )
            .setPosition(Position.fromXY(x, 0))
            .setMultiLinePlayerDescription(description_lines)
            .build();
        deciderCombinatorEntities.push(deciderCombinator);
    })

    return new BlueprintBuilder()
        .setLabel(machine.output.item_name + " Inserter Clock Schedule")
        .setEntities([
            clock,
            ...deciderCombinatorEntities
        ])
        .setWires([[1, 2, 1, 4]])
        .build();
}

main()
