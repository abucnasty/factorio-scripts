import assert from "../../../common/assert";
import { ItemName } from "../../../data";
import { BeltState, ChestState, EntityState, InserterState, InserterStatus, MachineState, ReadableEntityStateRegistry } from "../../../state";
import { InserterMode } from "./inserter-mode";

export class InserterPickupMode implements InserterMode {

    public static create(args: {
        inserterState: InserterState,
        sourceState: EntityState,
        sinkState: EntityState,
    }): InserterPickupMode {
        return new InserterPickupMode(
            args.inserterState,
            args.sourceState,
            args.sinkState,
        );
    }

    public readonly status = InserterStatus.PICKUP;

    private current_tick: number = 0;

    constructor(
        private readonly inserterState: InserterState,
        private readonly sourceEntityState: EntityState,
        private readonly sinkEntityState: EntityState,
    ) { }

    public onEnter(fromMode: InserterMode): void {
        this.current_tick = 0;
    }

    public onExit(toMode: InserterMode): void {
        // No action needed on exit
    }

    public executeForTick(): void {
        if (!canPickupFromEntity(this.inserterState, this.sourceEntityState)) {
            // cannot pickup, go idle
            this.inserterState.status = InserterStatus.IDLE;
            return;
        }

        this.current_tick += 1;

        const source = this.sourceEntityState;
        if (EntityState.isBelt(source)) {
            this.pickupFromBelt(this.inserterState, source);
        }
        if (EntityState.isMachine(source)) {
            this.pickupFromMachine(this.inserterState, source);
        }
        if (EntityState.isChest(source)) {
            this.pickupFromChest(this.inserterState, source);
        }

        if (this.heldItemQuantity() === this.inserterState.inserter.metadata.stack_size) {
            return;
        }        
    }

    private heldItemQuantity(): number {
        return this.inserterState.held_item?.quantity ?? 0
    }

    private pickupFromBelt(inserter_state: InserterState, source: BeltState): void {

        const sink = this.sinkEntityState;

        if (!EntityState.isMachine(sink)) {
            throw new Error("Inserter sink is not a machine");
        }

        const held_item = inserter_state.held_item

        if (held_item) {
            const lane = source.belt.lanes.find(lane => lane.ingredient_name === held_item.item_name);
            assert(lane, `No belt lane found for item ${held_item.item_name}`);
            const stack_size = lane.stack_size;
            held_item.quantity = held_item.quantity + stack_size;
            inserter_state.inventoryState.addQuantity(held_item.item_name, stack_size);
            inserter_state.held_item = held_item;
            return;
        }

        for (const item_name of inserter_state.inserter.filtered_items) {
            if (!MachineState.machineInputIsBlocked(sink, item_name)) {
                const lane = source.belt.lanes.find(lane => lane.ingredient_name === item_name);
                assert(lane, `No belt lane found for item ${item_name}`);
                const stack_size = lane.stack_size;
                inserter_state.held_item = { item_name: item_name, quantity: stack_size };
                inserter_state.inventoryState.addQuantity(item_name, stack_size);
                return;
            }
        }
    }

    private pickupFromMachine(state: InserterState, source: MachineState): void {
        const output_item_name = source.machine.output.ingredient.name;
        const output_quantity = source.inventoryState.getQuantity(output_item_name);

        const held_item = state.held_item ?? { item_name: output_item_name, quantity: 0 }

        const pickup_quantity = Math.min(
            state.inserter.metadata.stack_size - held_item.quantity,
            output_quantity
        );

        if (pickup_quantity <= 0) {
            return;
        }

        state.held_item = { item_name: held_item.item_name, quantity: held_item.quantity + pickup_quantity };
        state.inventoryState.addQuantity(output_item_name, pickup_quantity);
        source.inventoryState.removeQuantity(output_item_name, pickup_quantity);
    }

    /**
     * Pick up items from a chest source.
     * 
     * The chest only holds a single item type (item_filter), so we pick up
     * as many items as possible up to the inserter's stack size.
     */
    private pickupFromChest(state: InserterState, source: ChestState): void {
        const item_name = source.getItemFilter();
        const available_quantity = source.getCurrentQuantity();

        const held_item = state.held_item ?? { item_name: item_name, quantity: 0 };

        const pickup_quantity = Math.min(
            state.inserter.metadata.stack_size - held_item.quantity,
            available_quantity
        );

        if (pickup_quantity <= 0) {
            return;
        }

        state.held_item = { item_name: held_item.item_name, quantity: held_item.quantity + pickup_quantity };
        state.inventoryState.addQuantity(item_name, pickup_quantity);
        source.inventoryState.removeQuantity(item_name, pickup_quantity);
    }

    private hasPickupDurationElapsed(): boolean {
        return this.current_tick >= this.inserterState.inserter.animation.pickup.ticks;
    }
}


function canPickupFromEntity(inserter_state: InserterState, entity_state: EntityState): boolean {

    if (EntityState.isBelt(entity_state)) {
        return true;
    }

    if (EntityState.isMachine(entity_state)) {
        const output_item_name = entity_state.machine.output.ingredient.name;
        const output_quantity = entity_state.inventoryState.getQuantity(output_item_name);
        // TODO: this should be configurable, setting to stack size for now
        const output_threshold = 1
        if (output_quantity >= output_threshold && canPickupItem(inserter_state, output_item_name)) {
            return true;
        }
    }

    if (EntityState.isChest(entity_state)) {
        const item_name = entity_state.getItemFilter();
        const available_quantity = entity_state.getCurrentQuantity();
        // Can pickup if chest has at least 1 item and inserter can pick up this item type
        if (available_quantity >= 1 && canPickupItem(inserter_state, item_name)) {
            return true;
        }
    }

    return false;
}

function canPickupItem(inserter: InserterState, itemName: ItemName): boolean {
    if (inserter.inserter.filtered_items.size === 0) {
        return true;
    }
    return inserter.inserter.filtered_items.has(itemName);
}