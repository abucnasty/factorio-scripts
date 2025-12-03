import assert from "assert";
import { EntityState, InserterState, InserterStatus, MachineState } from "../../../../state";
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
}