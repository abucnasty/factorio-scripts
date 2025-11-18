import { CraftingCycle, CraftingCycleFactory } from "../crafting/crafting-cycle";
import { Inserter, MachineInteractionPoint } from "../crafting/inserter";
import { ReadableInserterRegistry } from "../crafting/inserter-registry";
import { Machine } from "../crafting/machine";
import { ReadableMachineRegistry } from "../crafting/machine-registry";
import { OpenRange } from "../data-types/range";
import Fraction, { fraction } from "fractionability";
import { lcm } from "mathjs"
import { MachineState } from "../state/machine-state";
import { MachineControlLogic } from "../control-logic/machine-control-logic";

interface EnabledTickRange {
    cycle_index: number;
    swing_count: number;
    enabled_ticks: OpenRange;
}

interface InserterSchedule {
    inserter: Inserter;
    enabledTickRanges: EnabledTickRange[];
}

export function computeInserterTickTimingForMachine(
    machine: Machine,
    inserterRegistry: ReadableInserterRegistry,
    targetItemsPerSecond: number
): InserterSchedule[] {

    const inserters = inserterRegistry.getInsertersForMachine(machine.id);

    const outputInserter = inserters.find(inserter => inserter.source.type === "machine" && inserter.source.machine_id === machine.id);

    if (!outputInserter) {
        throw new Error(`No output inserter found for machine with id ${machine.id}`);
    }

    const inputInserters = inserters.filter(inserter => inserter.target.type === "machine" && inserter.target.machine_id === machine.id);

    const machineOutputCraftingCycle = CraftingCycleFactory.fromProductionRate(
        machine.output.production_rate.limitTo(fraction(targetItemsPerSecond)),
        outputInserter.stack_size
    );

    console.log(`Machine Output Crafting Cycle to produce ${targetItemsPerSecond} ${machine.recipe.name}(s): ${machineOutputCraftingCycle.total_ticks.toString()} ticks`);

    const machineState = new MachineState(machine);
    const machineControlLogic = new MachineControlLogic(machineState);


    const output_produced_per_cycle = machineOutputCraftingCycle.stack_size;

    const craft_count_per_cycle = fraction(output_produced_per_cycle).divide(machine.output.amount_per_craft)

    const inputs_consumed_per_cycle: Record<string, Fraction> = Object.fromEntries(Object.entries(machine.inputs).map(([ingredient_name, input]) => {
        const input_per_craft = fraction(input.ingredient.amount);
        const input_consumed = input_per_craft.multiply(craft_count_per_cycle);
        return [ingredient_name, input_consumed];
    }))

    const totalCycleCount = computeLeastCommonMultipleForIngredients(machine, machineOutputCraftingCycle);
    console.log(`Total Cycle Count for balanced production: ${totalCycleCount}`);

    const output_inserter_schedule: InserterSchedule = {
        inserter: outputInserter,
        enabledTickRanges: []
    };

    const input_inserter_schedules: InserterSchedule[] = inputInserters.map(inputInserter => ({
        inserter: inputInserter,
        enabledTickRanges: []
    }));

    for (let cycle = 0; cycle < totalCycleCount; cycle++) {
        const startTick = cycle * machineOutputCraftingCycle.total_ticks.toDecimal();

        output_inserter_schedule.enabledTickRanges.push({
            cycle_index: cycle,
            swing_count: 1,
            enabled_ticks: OpenRange.from(
                startTick + outputInserter.pickup_ticks.start_inclusive,
                startTick + outputInserter.total_ticks.end_inclusive,
            )
        });

        for (const inputInserter of inputInserters) {
            const ingredientName = inputInserter.ingredient_name;
            const input = machine.inputs[ingredientName];
            const consumptionRatePerTick = input.consumption_rate.rate_per_tick;
            const consumptionRatePerCycle = inputs_consumed_per_cycle[ingredientName];
            const currentInventoryCount = machineState.inventoryState.getQuantity(ingredientName);

            const amountRequiredToBeInsertedThisCycle = consumptionRatePerCycle.subtract(currentInventoryCount);

            // const pickupStartTickOffset = machineState.

            console.log({
                ingredientName,
                consumptionRatePerTick,
                consumptionRatePerCycle,
                currentInventoryCount,
                amountRequiredToBeInsertedThisCycle: amountRequiredToBeInsertedThisCycle.toMixedNumber(),
            })

            const inserterSchedule = input_inserter_schedules.find(schedule => schedule.inserter === inputInserter)!!;
        }

        for (let tick = 0; tick < machineOutputCraftingCycle.total_ticks.toDecimal(); tick++) {
            machineControlLogic.execute();
        }
    }

    return [
        output_inserter_schedule,
        ...input_inserter_schedules
    ]
}

function computeLeastCommonMultipleForIngredients(
    machine: Machine,
    craftingCycle: CraftingCycle
) {
    const output = machine.output;
    const inputs = machine.inputs;

    console.log({ craftingCycle });

    const output_produced_per_cycle = craftingCycle.stack_size;

    const craft_count_per_cycle = fraction(output_produced_per_cycle).divide(machine.output.amount_per_craft)

    const inputs_consumed_per_cycle = Object.values(inputs).map(it => {
        const input_per_craft = fraction(it.ingredient.amount);
        const input_consumed = input_per_craft.multiply(craft_count_per_cycle);
        return input_consumed;
    })

    const denominators = inputs_consumed_per_cycle.map(ir => ir.getDenominator)
    return denominators.reduce((multiple, val) => lcm(multiple, val), 1);
}