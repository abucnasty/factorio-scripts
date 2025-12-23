import { InventoryState, WritableInventoryState } from "./inventory-state";
import { ProgressState } from "./progress-state";
import { EntityId, Machine } from "../entities";
import { EntityState } from "./entity-state";
import { Logger, defaultLogger } from "../common/logger";

export const MachineStatus = {
    INGREDIENT_SHORTAGE: 'INGREDIENT_SHORTAGE',
    WORKING: 'WORKING',
    OUTPUT_FULL: 'OUTPUT_FULL',
} as const;

export type MachineStatus = typeof MachineStatus[keyof typeof MachineStatus];

export class MachineState implements EntityState {

    public static forMachine = forMachine
    public static clone = clone
    public static machineInputIsBlocked = machineInputIsBlocked
    public static machineIsOutputBlocked = machineIsOutputBlocked
    public static machineAcceptsItem = machineAcceptsItem
    public static print = printMachineState

    constructor(
        public readonly entity_id: EntityId,
        public readonly machine: Machine,
        public readonly craftingProgress: ProgressState,
        public readonly bonusProgress: ProgressState,
        public readonly inventoryState: WritableInventoryState,
        public craftCount: number,
        public status: MachineStatus,
        public totalCrafted: number,
    ) { }

    public toString(): string {
        return `MachineState(${this.entity_id},recipe=${this.machine.metadata.recipe.name},status=${this.status})`;
    }
}

function forMachine(machine: Machine): MachineState {
    const inventoryState = InventoryState.createFromMachineInputs(machine.inputs);
    return new MachineState(
        machine.entity_id,
        machine,
        ProgressState.empty(),
        ProgressState.empty(),
        inventoryState,
        0,
        MachineStatus.INGREDIENT_SHORTAGE,
        0,
    );
}

function clone(machineState: MachineState): MachineState {
    return new MachineState(
        machineState.entity_id,
        machineState.machine,
        ProgressState.clone(machineState.craftingProgress),
        ProgressState.clone(machineState.bonusProgress),
        machineState.inventoryState.clone(),
        machineState.craftCount,
        machineState.status,
        machineState.totalCrafted,
    )
}

function machineAcceptsItem(machineState: MachineState, itemName: string): boolean {
    const machine = machineState.machine;

    return machine.inputs.has(itemName);
}

function machineInputIsBlocked(machineState: MachineState, ingredientName: string): boolean {

    if (!machineAcceptsItem(machineState, ingredientName)) {
        return true;
    }

    if (machineIsOutputBlocked(machineState)) {
        return true;
    }

    const machine = machineState.machine;
    const input = machine.inputs.getOrThrow(ingredientName);
    const currentQuantity = machineState.inventoryState.getQuantity(input.ingredient.name);

    return currentQuantity >= input.automated_insertion_limit.quantity;
}

function machineIsOutputBlocked(machineState: MachineState): boolean {
    const machine = machineState.machine;

    const outputBlock = machine.output.outputBlock;
    const currentQuantity = machineState.inventoryState.getQuantity(outputBlock.item_name);

    return currentQuantity >= outputBlock.quantity
}


function printMachineState(machineState: MachineState, logger: Logger = defaultLogger): void {
    logger.log(`Machine ${machineState.entity_id}: (recipe = ${machineState.machine.metadata.recipe.name})`);
    logger.log(`  Status: ${machineState.status}`);
    logger.log(`  Craft Count: ${machineState.craftCount}`);
    logger.log(`  Total Crafted: ${machineState.totalCrafted}`);
    logger.log(`  Crafting Progress: ${machineState.craftingProgress.progress}`);
    logger.log(`  Bonus Progress: ${machineState.bonusProgress.progress}`);
    logger.log(`  Inventory State:`);
    for (const inventory_item of machineState.inventoryState.getAllItems()) {
        logger.log(`    ${inventory_item.item_name}: ${inventory_item.quantity}`);
    }
}