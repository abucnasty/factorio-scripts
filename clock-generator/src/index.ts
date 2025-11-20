import { InserterFactory, MachineInteractionPoint } from './crafting/inserter';
import { MachineFactory, printMachineFacts } from './crafting/machine';
import { Config } from './config/config';
import { MachineRegistry } from './crafting/machine-registry';
import { InserterRegistry } from './crafting/inserter-registry';
import { computeInserterSchedule, computeInserterSwingCounts, computeMaxInputSwings, computeMaxOutputSwingsForInserter, InserterSchedule, SwingCountsPerClockCycle } from './inserter-swing-logic/machine-swings';
import * as EXAMPLES from './config/examples';
import { DeciderCombinatorEntity } from './blueprints/entity/decider-combinator';
import { Position, Signal, SignalId } from './blueprints/components';
import { blueprint, blueprintBook, FactorioBlueprint, FactorioBlueprintBook, FactorioBlueprintFile } from './blueprints/blueprint';
import { encodeBlueprintFile } from './blueprints/serde';
import { entityWithId } from './blueprints/entity/entity-with-id';


const config: Config = EXAMPLES.LOGISTIC_SCIENCE_CONFIG


const main = () => {
    const machineRegistry = new MachineRegistry();
    const inserterRegistry = new InserterRegistry();
    const inserterFactory = new InserterFactory(machineRegistry);

    config.machines.forEach(machineConfig => {
        machineRegistry.setMachine(MachineFactory.fromConfig(machineConfig))
    });

    config.inserters.forEach(inserterConfig => {
        inserterRegistry.createNewInserter(inserterFactory.fromConfig(inserterConfig))
    });

    const primaryMachine = machineRegistry.getMachineByRecipeOrThrow(config.target_output.recipe);

    printMachineFacts(primaryMachine);

    const inserters = inserterRegistry.getInsertersForMachine(primaryMachine.id)

    const outputInserter = inserters.find(inserter => {
        return inserter.target.type === "belt";
    });

    if (!outputInserter) {
        throw new Error(`No inserter found for output of primary machine with id ${primaryMachine.id}`);
    }

    const inputInserters = inserters.filter(it => it.target.machine_id == primaryMachine.id)

    const maxInputSwingsPerCycle = computeMaxInputSwings(primaryMachine, inserterRegistry);

    console.log(`Input Inserter Timing:`)
    maxInputSwingsPerCycle.forEach(([inserter, maxSwings]) => {
        console.log(`- Inserter (${inserter.ingredient_name}) max swings per cycle: ${maxSwings}`);
    })

    console.log("")
    console.log(`Computing Output Inserter Timing:`)
    const maxOutputSwingsPerCycle = computeMaxOutputSwingsForInserter(primaryMachine, inserterRegistry);

    console.log(`Output Inserter (${outputInserter.ingredient_name}) max safe swings per cycle: ${maxOutputSwingsPerCycle}`);


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
    const clock = DeciderCombinatorEntity.clock(totalClockTicks, 1);
    clock.position = Position.fromXY(x, 0);

    const deciderCombinatorEntities = schedules.map(schedule => {
        const itemSignalId = SignalId.item(schedule.inserter.ingredient_name);
        const deciderCombinator = DeciderCombinatorEntity.fromRanges(
            SignalId.clock,
            schedule.ranges.flatMap(it => it.range),
            itemSignalId
        )

        x += 1;
        deciderCombinator.position = Position.fromXY(x, 0);
        return deciderCombinator;
    })


    return blueprint({
        label: swingCountsPerClockCycle.craftingMachine.output.item_name + " Inserter Clock Schedule",
        entities: [
            clock,
            ...deciderCombinatorEntities
        ].map((it, index) => entityWithId(it, index + 1)),
        wires: [[1, 2, 1, 4]],

    })

}

main()
