import Fraction, { fraction } from "fractionability";
import { MachineState } from "../state/machine-state";
import assert from "assert";
import { lcm } from "mathjs"
import { OpenRange } from "../data-types/range";
import { CraftingCycle } from "../crafting/crafting-cycle";
import { TargetProductionRate } from "../config/config";
import { Inserter, Machine, ProductionRate, ReadableInserterRegistry } from "../entities";

export const computeMaxInputSwings = (
    machine: Machine,
    inserterRegistry: ReadableInserterRegistry
): [Inserter, number][] => {
    const inserters = inserterRegistry.getInsertersForMachine(machine.id).filter(it => it.target.machine_id == machine.id)
    return inserters.map(inserter => {
        const swings = computeMaxInputSwingsForInserter(machine, inserter);
        return [inserter, swings] as [Inserter, number];
    })
}

export const computeMaxInputSwingsForInserter = (
    machineTarget: Machine,
    inserter: Inserter,
): number => {

    const inputs = machineTarget.inputs

    const machineState = MachineState.forMachine(machineTarget);
    const input = inputs.get(inserter.ingredient_name)!;

    const automatedInsertionLimit = input.automated_insertion_limit.quantity;


    const outputRatePerTick = machineTarget.output.production_rate.rate_per_tick;

    let swings = 0;
    let lastTick = 0;
    while (true) {
        swings += 1;
        // assume the current tick is the drop tick
        const currentTick = inserter.drop_ticks.end_inclusive - inserter.pickup_ticks.start_inclusive;

        const elapsedDuration = lastTick + currentTick + 1;

        const craftsCompleted = outputRatePerTick.multiply(elapsedDuration);

        machineState.inventoryState.addQuantity(inserter.ingredient_name, inserter.stack_size);
        machineState.inventoryState.addQuantity(
            machineTarget.output.item_name,
            craftsCompleted.multiply(machineTarget.output.amount_per_craft).toDecimal()
        );

        const currentMachineInputQuantity = machineState.inventoryState.getQuantity(inserter.ingredient_name);
        const currentMachineOutputQuantity = machineState.inventoryState.getQuantity(machineTarget.output.item_name);
        // if machine exceeds automated insertion limit, stop swings
        if (currentMachineInputQuantity >= automatedInsertionLimit) {
            break;
        }

        // if machine is output blocked due to overload multiplier, no swings allowed
        if (currentMachineOutputQuantity >= machineTarget.output.outputBlock.quantity) {
            break;
        }

        lastTick = currentTick;
    }

    return swings;
}

export const computeMaxOutputSwingsForInserter = (
    machine: Machine,
    inserterRegistry: ReadableInserterRegistry,
): Fraction => {

    const inserters = inserterRegistry.getInsertersForMachine(machine.id)

    const inputInserters = inserters.filter(it => it.target.machine_id == machine.id);
    const outputInserters = inserters.filter(it => it.source.machine_id == machine.id);

    const potentialOutputAmount = inputInserters.map(inserter => {
        const inserterInputAmount = computeMaxInputSwingsForInserter(machine, inserter) * inserter.stack_size;

        const machineInput = machine.inputs.get(inserter.ingredient_name);
        assert(machineInput !== undefined, `Machine ${machine.id} does not have input for inserter ingredient ${inserter.ingredient_name}`);
        const output = machine.output;

        const outputAmount = output.amount_per_craft.divide(machineInput.consumption_rate.amount_per_craft).multiply(inserterInputAmount);

        return outputAmount;
    })

    const minOutput = potentialOutputAmount.reduce((a, b) => a.toDecimal() < b.toDecimal() ? a : b, fraction(1e9));

    return minOutput.divide(outputInserters[0].stack_size);
}


export interface SwingCountsPerClockCycle {
    craftingCycle: CraftingCycle;
    totalClockCycle: CraftingCycle;
    craftingCycleCount: number;
    craftingMachine: Machine;
    inserterSwingCounts: Map<Inserter, Fraction>;
}

export const computeInserterSwingCounts = (
    machine: Machine,
    inserterRegistry: ReadableInserterRegistry,
    targetProductionRate: TargetProductionRate,
    recommendedOutputSwingsPerCycle: number
): SwingCountsPerClockCycle => {
    const inserters = inserterRegistry.getInsertersForMachine(machine.id)
    const inputInserters = inserters.filter(it => it.target.machine_id == machine.id)
    const outputInserters = inserters.filter(it => it.source.machine_id == machine.id)

    assert(outputInserters.length === 1, `Expected exactly one output inserter for machine ${machine.id}, found ${outputInserters.length}`);

    let targetOutputSwings = recommendedOutputSwingsPerCycle;
    if (targetProductionRate.overrides?.output_swings !== undefined) {
        targetOutputSwings = targetProductionRate.overrides.output_swings;
        if (targetOutputSwings > recommendedOutputSwingsPerCycle) {
            console.warn(`WARNING: Overriding recommended output swings per cycle to a higher value (${targetOutputSwings}) than recommended (${recommendedOutputSwingsPerCycle}). This may cause issues.`);
        }
    }

    const outputInserter = outputInserters[0];

    const outputTargetPerMachine = fraction(targetProductionRate.items_per_second, targetProductionRate.machines)
    const throttledProductionRatePerMachine = ProductionRate.limitTo(machine.output.production_rate, outputTargetPerMachine);

    console.log(`Target Production Rate per Machine: ${throttledProductionRatePerMachine.rate_per_second} (${throttledProductionRatePerMachine.rate_per_second.toDecimal()}) items/sec`)

    const outputCraftingCycle = CraftingCycle.fromProductionRate(
        throttledProductionRatePerMachine,
        outputInserter.stack_size * targetOutputSwings
    );

    console.log(`Output Crafting Cycle Ticks: ${outputCraftingCycle.total_ticks.toMixedNumber()} ticks for ${outputCraftingCycle.items_per_cycle} items over ${targetOutputSwings} swings`)


    // TODO: finish implementing least common multiple of denominators
    const inputStats = inputInserters.map(inputInserter => {
        const machineInput = machine.inputs.get(inputInserter.ingredient_name);
        assert(machineInput !== undefined, `Machine ${machine.id} does not have input for inserter ingredient ${inputInserter.ingredient_name}`);
        const output = machine.output;

        const inputToOutputRatio = fraction(machineInput.consumption_rate.amount_per_craft).divide(output.amount_per_craft);
        const amountConsumedPerCycle = throttledProductionRatePerMachine.rate_per_tick.multiply(outputCraftingCycle.total_ticks).multiply(inputToOutputRatio);
        console.log(`- For input (${inputInserter.ingredient_name}):`);
        console.log(`  - Input to Output Ratio: ${inputToOutputRatio.getNumerator}:${inputToOutputRatio.getDenominator}`);
        console.log(`  - Output per Cycle: ${outputCraftingCycle.items_per_cycle}`);
        console.log(`  - Amount Consumed Per Cycle: ${amountConsumedPerCycle}`);
        console.log(`  - Swings Needed: ${amountConsumedPerCycle.divide(inputInserter.stack_size)}`);
        return {
            inserter: inputInserter,
            inputToOutputRatio,
            amountConsumedPerCycle,
            swingsNeeded: amountConsumedPerCycle.divide(inputInserter.stack_size),
        }
    })

    inputStats.forEach(stat => {
        console.log(`Input Inserter (${stat.inserter.ingredient_name}) needs ${stat.swingsNeeded.toMixedNumber()} swings per ${targetOutputSwings} swings of ${outputInserter.ingredient_name}.`);
    })

    let leastCommonMultiple = 1;
    if (inputStats.some((it) => !(it.swingsNeeded.getDenominator == 0))) {
        const denominators = inputStats.map(it => it.swingsNeeded.getDenominator);
        leastCommonMultiple = denominators.reduce((acc, val) => lcm(acc, val), 1);
    }

    console.log(`Least Common Multiple of Input Swing Denominators: ${leastCommonMultiple}`);

    const craftingCycleCount = leastCommonMultiple;

    const totalClockCycle = CraftingCycle.fromItemsPerSecond(
        throttledProductionRatePerMachine.rate_per_second,
        outputCraftingCycle.items_per_cycle.multiply(craftingCycleCount)
    )

    console.log(`Adjusting output crafting cycle to ${craftingCycleCount} total cycles in: ${totalClockCycle.total_ticks.toMixedNumber()} ticks`)

    const inserterSwingCounts = new Map<Inserter, Fraction>();
    inserterSwingCounts.set(outputInserter, fraction(targetOutputSwings).multiply(craftingCycleCount));
    inputStats.forEach(stat => {
        inserterSwingCounts.set(stat.inserter, stat.swingsNeeded.multiply(craftingCycleCount));
    })

    for (const [inserter, swingCount] of inserterSwingCounts.entries()) {
        console.log(`- Inserter (${inserter.ingredient_name}): ${swingCount.toMixedNumber()} swings over ${totalClockCycle.total_ticks.toMixedNumber()} ticks`);
    }

    return {
        craftingCycle: outputCraftingCycle,
        totalClockCycle: totalClockCycle,
        craftingCycleCount: craftingCycleCount,
        craftingMachine: machine,
        inserterSwingCounts: inserterSwingCounts
    }
}

export interface EnabledRange {
    cycle_index: number;
    range: OpenRange;
    swing_count: number;
}

export interface InserterSchedule {
    inserter: Inserter;
    ranges: EnabledRange[];
    swing_count: number;
}

export const computeInserterSchedule = (
    swingCountsPerClockCycle: SwingCountsPerClockCycle,
    inserterRegistry: ReadableInserterRegistry,
): InserterSchedule[] => {

    const {
        craftingCycle,
        totalClockCycle,
        craftingCycleCount,
        craftingMachine,
        inserterSwingCounts
    } = swingCountsPerClockCycle;

    // we want to always schedule the output inserter to remove items at the beginning of the crafting cycle

    const inputInserters = inserterRegistry.getInsertersForMachine(craftingMachine.id).filter(it => it.target.machine_id == craftingMachine.id);
    const outputInserters = inserterRegistry.getInsertersForMachine(craftingMachine.id).filter(it => it.source.machine_id == craftingMachine.id);

    assert(outputInserters.length === 1, `Expected exactly one output inserter for machine ${craftingMachine.id}, found ${outputInserters.length}`);
    const outputInserter = outputInserters[0];

    const schedules: Map<Inserter, InserterSchedule> = new Map(
        Array.from(inserterSwingCounts.entries()).map(([inserter, swingCount]) => {
            const schedule: InserterSchedule = {
                inserter: inserter,
                ranges: [],
                swing_count: swingCount.toDecimal()
            };
            return [inserter, schedule];
        })
    );

    // schedule output inserter first
    const insertionDuration = craftingMachine.insertion_duration.tick_duration
    const expectedMachineOutputBuffer = fraction(schedules.get(outputInserter)!.swing_count, craftingCycleCount).multiply(outputInserter.stack_size);
    const timeToCraftOutputBuffer = craftingCycle.total_ticks.multiply(expectedMachineOutputBuffer).divide(craftingCycle.items_per_cycle);

    // output inserter should be fixed.
    for (let craftingCycleIndex = 0; craftingCycleIndex < craftingCycleCount; craftingCycleIndex++) {
        const startTick = 1 + craftingCycle.total_ticks.multiply(craftingCycleIndex).toDecimal();
        const swingsPerCycle = inserterSwingCounts.get(outputInserter)!.divide(craftingCycleCount);

        const swingDuration = outputInserter.total_ticks.duration() * swingsPerCycle.toDecimal();
        // this is used to allow the inserter to hold a buffer on the return swing back to the assembly machine
        const bufferDuration = outputInserter.pickup_ticks.duration();

        schedules.get(outputInserter)!.ranges.push(
            {
                cycle_index: craftingCycleIndex,
                range: OpenRange.from(
                    startTick,
                    startTick + swingDuration + bufferDuration
                ),
                swing_count: swingsPerCycle.toDecimal()
            }
        );
    }

    // input inserters need to honor crafting time from the machines actual production rate
    for (let craftingCycleIndex = 0; craftingCycleIndex < craftingCycleCount; craftingCycleIndex++) {
        const cycleStartTick = 1 + craftingCycle.total_ticks.multiply(craftingCycleIndex).toDecimal();
        const outputInserterRange: EnabledRange | undefined = schedules.get(outputInserter)!.ranges.find(it => it.cycle_index === craftingCycleIndex);
        assert(outputInserterRange !== undefined, `Expected to find output inserter range for crafting cycle index ${craftingCycleIndex}`);

        const outputBlockQuantity = craftingMachine.output.outputBlock.quantity
        const swingsUntilUnderOutputBuffer = expectedMachineOutputBuffer.subtract(outputBlockQuantity).divide(outputInserter.stack_size);
        const outputSwingUnblockCount = Math.ceil(swingsUntilUnderOutputBuffer.toDecimal())

        const startTick = cycleStartTick + outputSwingUnblockCount * outputInserter.total_ticks.duration();

        for(const inserter of inputInserters) {
            const swingsPerCycle = inserterSwingCounts.get(inserter)!.divide(craftingCycleCount);

            const machineInput = craftingMachine.inputs.get(inserter.ingredient_name)
            assert(machineInput !== undefined, `Machine ${craftingMachine.id} does not have input for inserter ingredient ${inserter.ingredient_name}`);

            const maxSequentialSwings = Math.ceil(machineInput.automated_insertion_limit.quantity / inserter.stack_size);

            let swingsThisCycle = swingsPerCycle.toDecimal();

            if (swingsPerCycle.getDenominator !== 1) {
                swingsThisCycle = craftingCycleIndex % swingsPerCycle.getDenominator
            }

            if (swingsThisCycle === 0) {
                continue;
            }

            if(swingsThisCycle > maxSequentialSwings) {
                console.warn(`WARNING: Inserter (${inserter.prettyPrint()}) requires ${swingsThisCycle} swings per cycle, which exceeds its initial automated insertion limit of ${maxSequentialSwings} swings. Offsetting swings to compensate.`);
                
                // Offset the startTick to compensate for the automated insertion limit
                // This logic cannot honor automated insertion limits since the machine is assuming to be crafting the entire time
                // this may result in the inserters waking up more than desired
                const ticksUntilInventoryTransferredIsDepleted = fraction(inserter.stack_size).divide(machineInput.consumption_rate.rate_per_tick).toDecimal()

                if (ticksUntilInventoryTransferredIsDepleted > insertionDuration.toDecimal()) {
                    console.warn(`WARNING: the inserter (${inserter.prettyPrint()}) will be output block before the second swing can occur.`)
                }
            }
            
            const swingDuration = inserter.total_ticks.duration() * swingsThisCycle - inserter.pickup_ticks.duration();

            schedules.get(inserter)!.ranges.push(
                {
                    cycle_index: craftingCycleIndex,
                    range: OpenRange.from(
                        startTick,
                        startTick + swingDuration
                    ),
                    swing_count: swingsThisCycle
                }
            );
        }

        // console.log({ swingsUntilUnderOutputBuffer, outputBlockQuantity, startTick })

    }

    return Array.from(schedules.values());
}