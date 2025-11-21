import { OpenRange } from "../data-types/range";
import { MachineState } from "../state/machine-state";
import { CraftingSimulator } from "./crafting-simulator";
import { IngredientRatio, RecipeMetadata } from "../entities";

export interface CraftEvent {
    machine_state: Readonly<MachineState>;
    tick_range: OpenRange;
    craft_index: number;
}

export interface MachineTickSnapshot {
    tick: number;
    machine_state: MachineState
    input_blocked: Record<string, boolean>;
}

export interface CraftingSequence {
    craft_events: CraftEvent[];
    snapshots_per_tick: MachineTickSnapshot[];
    input_insertion_ranges: Map<string, OpenRange[]>;
}

function createEmpty(): CraftingSequence {
    return {
        craft_events: [],
        snapshots_per_tick: [],
        input_insertion_ranges: new Map(),
    }
}

function createForMachine(machineState: Readonly<MachineState>): CraftingSequence {
    const machine = machineState.machine;
    const recipe: RecipeMetadata = machine.metadata.recipe;

    // determine the lowest input ingredient to determine the maximum output that can be crafted
    const minimumInputIngredient: IngredientRatio | null = Array.from(recipe.outputToInputRatios.values())
        .reduce<IngredientRatio | null>((agg, current) => {

            if (agg == null) {
                return current
            }

            const outputToInputRatio = current.fraction
            const currentInventoryAmount = machineState.inventoryState.getQuantity(current.input.name);

            const expectedOutput = Math.floor(outputToInputRatio.multiply(currentInventoryAmount).toDecimal())
            const aggExpectedOutput = Math.floor(agg.fraction.multiply(machineState.inventoryState.getQuantity(agg.input.name)).toDecimal())

            if (expectedOutput < aggExpectedOutput) {
                return current;
            }

            return agg;
        }, null);

    if (minimumInputIngredient == null) {
        return createEmpty();
    }

    const crafts: CraftEvent[] = [];
    const snapshots_per_tick: MachineTickSnapshot[] = [];

    let currentMachineState = machineState;

    let tick = 0;

    let last_craft_end_tick_inclusive = 0;
    let last_output_inventory: number = currentMachineState.inventoryState.getQuantity(machine.output.ingredient.name);
    let craft_index = 0;

    // arbitrary end condition to prevent infinite loops
    while (tick < 3600) {

        const machineStateSnapshot = CraftingSimulator.simulateMachineCraftForTicks(
            currentMachineState,
            1
        );

        const inputBlocked: Record<string, boolean> = {};
        machineStateSnapshot.machine.inputs.forEach((input) => {
            inputBlocked[input.ingredient.name] = CraftingSimulator.machineInputIsBlocked(
                machineStateSnapshot,
                input.ingredient.name
            );
        });



        snapshots_per_tick.push({
            machine_state: machineStateSnapshot,
            tick: tick,
            input_blocked: inputBlocked,
        })

        if (last_output_inventory < machineStateSnapshot.inventoryState.getQuantity(machine.output.ingredient.name)) {
            // craft occurred
            crafts.push({
                craft_index: craft_index,
                machine_state: machineStateSnapshot,
                tick_range: OpenRange.from(
                    last_craft_end_tick_inclusive,
                    tick
                )
            });
            last_craft_end_tick_inclusive = tick;
            last_output_inventory = machineStateSnapshot.inventoryState.getQuantity(machine.output.ingredient.name);
            craft_index++;
        }

        currentMachineState = machineStateSnapshot;

        if (CraftingSimulator.machineHasEnoughInputsForCraft(currentMachineState) === false) {
            break;
        }

        tick++
    }


    const input_insertion_ranges: Map<string, OpenRange[]> = new Map();
    machine.inputs.forEach((input) => {
        const insertion_range: OpenRange[] = [];

        let currentRange: OpenRange | null = null;

        snapshots_per_tick.forEach((snapshot) => {

            const inputIsBlocked = snapshot.input_blocked[input.ingredient.name]

            if (inputIsBlocked && currentRange != null) {
                currentRange = OpenRange.from(currentRange.start_inclusive, snapshot.tick - 1);
                insertion_range.push(currentRange);
                currentRange = null;
                return;
            }

            if (!inputIsBlocked && currentRange == null) {
                currentRange = OpenRange.from(snapshot.tick, snapshot.tick);
                return;
            }

            if (!inputIsBlocked && currentRange != null) {
                currentRange = OpenRange.from(currentRange.start_inclusive, snapshot.tick);
                return;
            }
        })

        input_insertion_ranges.set(input.ingredient.name, insertion_range);
    });

    return {
        craft_events: crafts,
        snapshots_per_tick: snapshots_per_tick,
        input_insertion_ranges: input_insertion_ranges,
    }
}

export const CraftingSequence = {
    createForMachine: createForMachine,
    createEmpty: createEmpty,
}