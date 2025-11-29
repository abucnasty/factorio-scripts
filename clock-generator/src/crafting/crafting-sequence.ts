import { OpenRange } from "../data-types/range";
import { MachineState } from "../state/machine-state";
import { CraftingSimulator } from "./crafting-simulator";
import { IngredientRatio, RecipeMetadata } from "../entities";
import { Duration } from "../data-types";
import { ReadableEntityStateRegistry } from "../state/entity-state-registry";
import { EntityState } from "../state/entity-state";
import { InserterControlLogic } from "../control-logic/inserter/inserter-control-logic";
import { InserterStatus } from "../state/inserter-state";
import { MachineControlLogic } from "../control-logic/machine-control-logic";

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
    total_duration: Duration;
}

function createEmpty(): CraftingSequence {
    return {
        craft_events: [],
        snapshots_per_tick: [],
        input_insertion_ranges: new Map(),
        total_duration: Duration.ofTicks(0),
    }
}

function createForMachine(
    machineState: Readonly<MachineState>,
    entityStateRegistry: ReadableEntityStateRegistry,
): CraftingSequence {
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

    let currentMachineState = MachineState.clone(machineState);

    let tick = 0;

    let last_craft_end_tick_inclusive = 0;
    let last_output_inventory: number = currentMachineState.inventoryState.getQuantity(machine.output.ingredient.name);
    let craft_index = 0;

    const inserter_control_logic = entityStateRegistry.getAllStates()
        .filter(it => EntityState.isInserter(it))
        .filter(it => it.inserter.sink.entity_id.id === machine.entity_id.id || it.inserter.source.entity_id.id === machine.entity_id.id)
        // temporarily only care about input inserters
        .filter(it => it.inserter.sink.entity_id.id === machine.entity_id.id )
        .map(it => new InserterControlLogic(
            it,
            entityStateRegistry
        ));

    inserter_control_logic.forEach(logic => {
        logic.registerStateChangeListener((data) => {
            const inserter = data.state.inserter;
            const id = inserter.entity_id.id;
            const new_status = data.status.to;
            let message = `Tick ${tick}\t: ${id} \t status=${new_status} \t`;
            switch(data.status.to) {
                case InserterStatus.SWING_TO_SINK:
                    message += `(with ${data.state.held_item?.quantity} "${data.state.held_item?.item_name}")`;
                    break;
                case InserterStatus.DROP_OFF:
                    message += `dropped off ${data.state.held_item?.quantity} "${data.state.held_item?.item_name}"`;
                    break;
            }
            console.log(message);
        })
    });

    const machineControlLogic = new MachineControlLogic(machineState);

    const controlLogic = [
        ...inserter_control_logic,
        machineControlLogic
    ]

    // arbitrary end condition to prevent infinite loops
    while (tick < 3600) {

        controlLogic.forEach(logic => logic.executeForTick());

        const inputBlocked: Record<string, boolean> = {};

        const machineStateSnapshot = MachineState.clone(machineState)
        
        machineStateSnapshot.machine.inputs.forEach((input) => {
            inputBlocked[input.ingredient.name] = MachineState.machineInputIsBlocked(
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

        tick++
    }


    const input_insertion_ranges: Map<string, OpenRange[]> = new Map();

    const max_tick = snapshots_per_tick.length > 0 ? snapshots_per_tick[snapshots_per_tick.length - 1].tick : 0;
    machine.inputs.forEach((input) => {
        const insertion_range: OpenRange[] = [];

        let currentRange: OpenRange | null = null;

        snapshots_per_tick.forEach((snapshot) => {

            const inputIsBlocked = snapshot.input_blocked[input.ingredient.name]

            // edge case to handle the entire insertion duration being not blocked
            if(!inputIsBlocked && snapshot.tick == 0 && currentRange == null) {
                currentRange = OpenRange.from(0,0)
                return;
            }
            // edge case to handle the entire insertion duration being not blocked
            if (snapshot.tick == max_tick && !inputIsBlocked && currentRange != null) {
                currentRange = OpenRange.from(currentRange.start_inclusive, snapshot.tick - 1);
                insertion_range.push(currentRange);
                currentRange = null;
                return;
            }

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
        total_duration: Duration.ofTicks(tick + 1),
    }
}

export const CraftingSequence = {
    createForMachine: createForMachine,
    createEmpty: createEmpty,
}