import assert from "../../../common/assert";
import { ChestState, EntityState, InserterState, InserterStatus, MachineState } from "../../../state";
import { InserterMode } from "./inserter-mode";

export class InserterDropMode implements InserterMode {
    public readonly status = InserterStatus.DROP_OFF;

    constructor(
        private readonly inserter_state: InserterState,
        private readonly sink_entity_state: EntityState
    ) { }

    public onEnter(fromMode: InserterMode): void { }

    public onExit(toMode: InserterMode): void { }

    public executeForTick(): void {
        if (EntityState.isBelt(this.sink_entity_state)) {
            this.dropOffToBelt(this.inserter_state);
        }

        if (EntityState.isMachine(this.sink_entity_state)) {
            this.dropOffToMachine(this.inserter_state, this.sink_entity_state);
        }

        if (EntityState.isChest(this.sink_entity_state)) {
            this.dropOffToChest(this.inserter_state, this.sink_entity_state);
        }
    }

    private dropOffToBelt(inserter_state: InserterState): void {
        // remove 4 items per tick to the belt over the drop duration
        const held_item = inserter_state.held_item;
        assert(
            held_item !== null, 
            `${inserter_state.entity_id} Held item should not be null when dropping off to belt`
        );

        inserter_state.inventoryState.removeQuantity(held_item.item_name, 4);
        held_item.quantity -= 4;

        assert(held_item.quantity >= 0, "Held item quantity went below 0");
        if (held_item.quantity == 0) {
            inserter_state.held_item = null;
        }
    }

    private dropOffToMachine(inserter_state: InserterState, sink: MachineState): void {
        // dropping to a machine should take 1 tick
        const held_item = inserter_state.held_item;
        assert(
            held_item !== null,
            `${inserter_state.entity_id} Held item should not be null when dropping off to machine`
        );
        sink.inventoryState.addQuantity(held_item.item_name, held_item.quantity);
        inserter_state.inventoryState.removeQuantity(held_item.item_name, held_item.quantity);
        inserter_state.held_item = null;
    }

    /**
     * Drop items to a chest with partial drop support.
     * 
     * If the chest has limited space, the inserter will only drop as many items
     * as can fit, leaving the remaining items in its hand. The inserter will
     * then transition to TARGET_FULL mode and wait for space.
     */
    private dropOffToChest(inserter_state: InserterState, sink: ChestState): void {
        const held_item = inserter_state.held_item;
        
        // If no items in hand, nothing to do
        if (held_item === null) {
            return;
        }

        const available_space = sink.getAvailableSpace();
        
        // If chest is full, nothing can be dropped this tick
        if (available_space <= 0) {
            return;
        }

        // Calculate how many items we can actually drop
        const items_to_drop = Math.min(held_item.quantity, available_space);

        // Add items to chest inventory
        sink.inventoryState.addQuantity(held_item.item_name, items_to_drop);
        
        // Remove items from inserter inventory and hand
        inserter_state.inventoryState.removeQuantity(held_item.item_name, items_to_drop);
        held_item.quantity -= items_to_drop;

        assert(held_item.quantity >= 0, "Held item quantity went below 0");
        
        // Clear held_item if all items have been dropped
        if (held_item.quantity === 0) {
            inserter_state.held_item = null;
        }
    }
}