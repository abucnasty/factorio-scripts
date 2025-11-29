import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { CraftingSequence } from './crafting/crafting-sequence';
import { MachineState } from './state/machine-state';
import assert from 'assert';
import { InserterFactory, InserterRegistry, Machine, MachineRegistry } from './entities';
import { Belt, BeltRegistry } from './entities/belt';
import { EntityType } from './entities/entity-type';
import { EntityRegistry } from './entities/entity-registry';
import { EntityStateRegistry } from './state/entity-state-registry';
import { EntityStateFactory } from './state/entity-state-factory';


const config: Config = EXAMPLES.UTILITY_SCIENCE_CONFIG;

const main = () => {
    const entityRegistry = new EntityRegistry();
    const machineRegistry = new MachineRegistry(entityRegistry);
    const inserterRegistry = new InserterRegistry(entityRegistry);
    const beltRegistry = new BeltRegistry(entityRegistry);
    const inserterFactory = new InserterFactory(machineRegistry, beltRegistry);
    const stateRegistry = new EntityStateRegistry(entityRegistry);
    const stateFactory = new EntityStateFactory(entityRegistry);


    config.belts.forEach(beltConfig => {
        entityRegistry.add(Belt.fromConfig(beltConfig));
    })

    config.machines.forEach(machineConfig => {
        entityRegistry.add(Machine.fromConfig(machineConfig))
    });

    config.inserters.forEach((inserterConfig, index) => {
        entityRegistry.add(inserterFactory.fromConfig(index, inserterConfig))
    });

    entityRegistry.getAll().forEach(entity => {
        stateRegistry.addState(stateFactory.createStateForEntity(entity.entity_id));
    });

    const primaryMachine = machineRegistry.getMachineByRecipeOrThrow(config.target_output.recipe);

    Machine.printMachineFacts(primaryMachine);

    const inserters = inserterRegistry.getInsertersForMachine(primaryMachine.entity_id)

    const outputInserter = inserters.find(inserter => {
        return inserter.source.entity_id.id === primaryMachine.entity_id.id;
    });

    assert(outputInserter != undefined, `No output inserter found for primary machine with id ${primaryMachine.entity_id}`);

    const inputInserters = inserters.filter(it => it.sink.entity_id.id === primaryMachine.entity_id.id)

    const initialState = stateRegistry.getStateByEntityIdOrThrow(primaryMachine.entity_id) as MachineState;
    // inputInserters.forEach(inserter => {
    //     inserter.filtered_items.forEach(itemName => {
    //         initialState.inventoryState.addQuantity(itemName, inserter.metadata.stack_size);
    //     })
    // })

    const craftingSequence = CraftingSequence.createForMachine(
        initialState,
        stateRegistry
    );
    
    // at this point we understand what will happen from an empty state and the maximum that can be crafted
    // if there is an insertion range for any input ingredients, that means that the inserter can swing more than once
    // during the crafting sequence, so we can scale up the number of initial swings per inserter to cram more items into
    // the machine at the beginning of the cycle

    const finalMachineState = craftingSequence.craft_events[craftingSequence.craft_events.length - 1].machine_state;

    const output_crafted = finalMachineState.inventoryState.getQuantity(config.target_output.recipe);

    console.log("------------------------------")
    console.log(`Total ${output_crafted} ${config.target_output.recipe} crafted with ${craftingSequence.craft_events.length} simulated crafts.`);    

    // console.log("------------------------------")
    // console.log("craft snapshots:")
    // craftingSequence.craft_events.forEach((craft) => {
    //     console.log(`Craft ${craft.craft_index + 1}:`);
    //     console.log(`- Craft Progress: ${craft.machine_state.craftingProgress.progress.toMixedNumber()}`);
    //     console.log(`- Bonus Progress: ${craft.machine_state.bonusProgress.progress.toMixedNumber()}`);
    //     console.log(`- Tick Range: [${craft.tick_range.start_inclusive}, ${craft.tick_range.end_inclusive}]`);
    //     craft.machine_state.inventoryState.getAllItems().forEach((item) => {
    //         console.log(`  - Inventory: ${item.item_name} = ${item.quantity}`);
    //     })
    // })

    console.log("------------------------------")
    craftingSequence.input_insertion_ranges.forEach((ranges, ingredientName) => {
        console.log(`Input Insertion Ranges for ${ingredientName}:`);
        ranges.forEach((range) => {
            console.log(`- [${range.start_inclusive} - ${range.end_inclusive}]`);
        })
    })
    return;
}


// function createBlueprintFromInserterSchedule(
//     swingCountsPerClockCycle: SwingCountsPerClockCycle,
//     schedules: InserterSchedule[]
// ): FactorioBlueprint {
//     let x = 0.5;
//     const totalClockTicks = swingCountsPerClockCycle.totalClockCycle.total_ticks.toDecimal()
//     const clock = DeciderCombinatorEntity
//         .clock(totalClockTicks, 1)
//         .setPosition(Position.fromXY(x, 0))
//         .build();

//     const deciderCombinatorEntities = schedules.map(schedule => {
//         const itemSignalId = SignalId.item(schedule.inserter.ingredient_name);
//         x += 1;
//         const deciderCombinator = DeciderCombinatorEntity
//             .fromRanges(
//                 SignalId.clock,
//                 schedule.ranges.flatMap(it => it.range),
//                 itemSignalId
//             )
//             .setPosition(Position.fromXY(x, 0))
//             .build();
//         return deciderCombinator;
//     })

//     return new BlueprintBuilder()
//         .setLabel(swingCountsPerClockCycle.craftingMachine.output.item_name + " Inserter Clock Schedule")
//         .setEntities([
//             clock,
//             ...deciderCombinatorEntities
//         ])
//         .setWires([[1, 2, 1, 4]])
//         .build();
// }

main()
