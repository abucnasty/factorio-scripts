import { InserterFactory } from './crafting/inserter';
import { Machine } from './crafting/machine';
import { Config } from './config/config';
import { MachineRegistry } from './crafting/machine-registry';
import { InserterRegistry } from './crafting/inserter-registry';
import { computeInserterSchedule, computeInserterSwingCounts, computeMaxInputSwings, computeMaxOutputSwingsForInserter, InserterSchedule, SwingCountsPerClockCycle } from './inserter-swing-logic/machine-swings';
import * as EXAMPLES from './config/examples';
import { DeciderCombinatorEntity } from './blueprints/entity/decider-combinator';
import { Position, SignalId } from './blueprints/components';
import { BlueprintBuilder, FactorioBlueprint } from './blueprints/blueprint';
import { encodeBlueprintFile } from './blueprints/serde';
import { CraftingSequence } from './inserter-swing-logic/crafting-sequence';
import { MachineState } from './state/machine-state';
import assert from 'assert';


const config: Config = EXAMPLES.UTILITY_SCIENCE_CONFIG


const main = () => {
    const machineRegistry = new MachineRegistry();
    const inserterRegistry = new InserterRegistry();
    const inserterFactory = new InserterFactory(machineRegistry);

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
        return inserter.source.machine_id === primaryMachine.id;
    });

    assert(outputInserter != undefined, `No output inserter found for primary machine with id ${primaryMachine.id}`);

    const inputInserters = inserters.filter(it => it.target.machine_id == primaryMachine.id)

    const maxInputSwingsPerCycle = computeMaxInputSwings(primaryMachine, inserterRegistry);

    console.log(`Input Inserter Timing:`)
    maxInputSwingsPerCycle.forEach(([inserter, maxSwings]) => {
        console.log(`- Inserter (${inserter.ingredient_name}) max swings per cycle: ${maxSwings}`);
    })

    console.log("------------------------------")
    console.log(`Computing Output Inserter Timing:`)
    const maxOutputSwingsPerCycle = computeMaxOutputSwingsForInserter(primaryMachine, inserterRegistry);

    console.log(`Output Inserter (${outputInserter.ingredient_name}) max safe swings per cycle: ${maxOutputSwingsPerCycle}`);


    const initialState = MachineState.forMachine(primaryMachine);
    inputInserters.forEach(inserter => {
        initialState.inventoryState.addQuantity(inserter.ingredient_name, inserter.stack_size);
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


    const swingCountsPerClockCycle = computeInserterSwingCounts(
        primaryMachine,
        inserterRegistry,
        config.target_output,
        maxOutputSwingsPerCycle.toDecimal()
    );

    // print clock tick results per cycle
    console.log("------------------------------")
    console.log(`Clock Schedule:`)
    console.log(`- Total Clock Cycle Ticks: ${swingCountsPerClockCycle.totalClockCycle.total_ticks.toMixedNumber()}`);
    console.log(`- Crafting Cycle Count: ${swingCountsPerClockCycle.craftingCycleCount} of ${swingCountsPerClockCycle.totalClockCycle.total_ticks.toMixedNumber()} ticks each`);
    swingCountsPerClockCycle.inserterSwingCounts.forEach((swingCount, inserter) => {
        console.log(`- Inserter (${inserter.ingredient_name}) Swings: ${swingCount} over ${swingCountsPerClockCycle.totalClockCycle.total_ticks.toMixedNumber()} ticks`);
    })
    console.log("------------------------------")


    const inserterSchedules = computeInserterSchedule(swingCountsPerClockCycle, inserterRegistry);

    inserterSchedules.forEach((schedule => {
        console.log(`Inserter (${schedule.inserter.ingredient_name}) Schedule:`);
        schedule.ranges.forEach((enabledRange, index) => {
            console.log(`- [Cycle ${enabledRange.cycle_index}] Swings ${enabledRange.swing_count} during ticks [${enabledRange.range.start_inclusive} - ${enabledRange.range.end_inclusive}]`);
        })
    }))

    const blueprint = createBlueprintFromInserterSchedule(
        swingCountsPerClockCycle,
        inserterSchedules
    );

    console.log("")
    console.log("Generated Blueprint Book JSON:")
    console.log(encodeBlueprintFile({
        blueprint: blueprint
    }));

}


function createBlueprintFromInserterSchedule(
    swingCountsPerClockCycle: SwingCountsPerClockCycle,
    schedules: InserterSchedule[]
): FactorioBlueprint {
    let x = 0.5;
    const totalClockTicks = swingCountsPerClockCycle.totalClockCycle.total_ticks.toDecimal()
    const clock = DeciderCombinatorEntity
        .clock(totalClockTicks, 1)
        .setPosition(Position.fromXY(x, 0))
        .build();

    const deciderCombinatorEntities = schedules.map(schedule => {
        const itemSignalId = SignalId.item(schedule.inserter.ingredient_name);
        x += 1;
        const deciderCombinator = DeciderCombinatorEntity
            .fromRanges(
                SignalId.clock,
                schedule.ranges.flatMap(it => it.range),
                itemSignalId
            )
            .setPosition(Position.fromXY(x, 0))
            .build();
        return deciderCombinator;
    })

    return new BlueprintBuilder()
        .setLabel(swingCountsPerClockCycle.craftingMachine.output.item_name + " Inserter Clock Schedule")
        .setEntities([
            clock,
            ...deciderCombinatorEntities
        ])
        .setWires([[1, 2, 1, 4]])
        .build();
}

main()
