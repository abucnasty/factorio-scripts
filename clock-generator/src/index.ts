import { Config } from './config/config';
import * as EXAMPLES from './config/examples';
import { CraftingSequence } from './crafting/crafting-sequence';
import { MachineState } from './state/machine-state';
import assert from 'assert';
import { InserterFactory, InserterRegistry, Machine, MachineRegistry } from './entities';
import { Belt, BeltRegistry } from './entities/belt';
import { EntityType } from './entities/entity-type';


const config: Config = EXAMPLES.UTILITY_SCIENCE_CONFIG

const main = () => {
    const machineRegistry = new MachineRegistry();
    const inserterRegistry = new InserterRegistry();
    const beltRegistry = new BeltRegistry();
    const inserterFactory = new InserterFactory(machineRegistry, beltRegistry);


    config.belts.forEach(beltConfig => {
        beltRegistry.setBelt(beltConfig.id, Belt.fromConfig(beltConfig));
    })

    config.machines.forEach(machineConfig => {
        machineRegistry.setMachine(Machine.fromConfig(machineConfig))
    });

    config.inserters.forEach(inserterConfig => {
        inserterRegistry.createNewInserter(inserterFactory.fromConfig(inserterConfig))
    });

    const primaryMachine = machineRegistry.getMachineByRecipeOrThrow(config.target_output.recipe);

    Machine.printMachineFacts(primaryMachine);

    const inserters = inserterRegistry.getInsertersForMachine(primaryMachine.id)

    const outputInserter = inserters.find(inserter => {
        return inserter.source.entity_type === EntityType.MACHINE && inserter.source.entity_id === primaryMachine.id;
    });

    assert(outputInserter != undefined, `No output inserter found for primary machine with id ${primaryMachine.id}`);

    const inputInserters = inserters.filter(it => it.sink.entity_type === EntityType.MACHINE && it.sink.entity_id === primaryMachine.id)

    const initialState = MachineState.forMachine(primaryMachine);
    inputInserters.forEach(inserter => {
        inserter.filtered_items.forEach(itemName => {
            initialState.inventoryState.addQuantity(itemName, inserter.metadata.stack_size);
        })
        
    })
    const craftingSequence = CraftingSequence.createForMachine(
        initialState
    );

    console.log("------------------------------")
    console.log("craft snapshots:")
    craftingSequence.craft_events.forEach((craft) => {
        console.log(`Craft ${craft.craft_index + 1}:`);
        console.log(`- Craft Progress: ${craft.machine_state.craftingProgress.progress.toMixedNumber()}`);
        console.log(`- Bonus Progress: ${craft.machine_state.bonusProgress.progress.toMixedNumber()}`);
        console.log(`- Tick Range: [${craft.tick_range.start_inclusive}, ${craft.tick_range.end_inclusive}]`);
        craft.machine_state.inventoryState.getAllItems().forEach((item) => {
            console.log(`  - Inventory: ${item.item_name} = ${item.quantity}`);
        })
    })

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
