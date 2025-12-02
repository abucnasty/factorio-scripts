import { ItemName } from "../../data/factorio-data-types";
import { EntityType } from "../../entities/entity-type";
import { BeltState } from "../../state/belt-state";
import { EntityState } from "../../state/entity-state";
import { ReadableEntityStateRegistry } from "../../state/entity-state-registry";
import { InserterState, InserterStatus } from "../../state/inserter-state";
import { MachineState } from "../../state/machine-state";
import { InserterStateControlLogic } from "./inserter-state-control-logic";
import assert from "assert";

export class InserterDropOffControlLogic implements InserterStateControlLogic {
    private entered_tick = 0;

    constructor(
        private readonly inserterState: InserterState,
        private readonly entityStateRegistry: ReadableEntityStateRegistry,
    ) { }

    public onEnter(): void {
        // no-op
    }

    public onExit(): void {
        this.entered_tick = 0;
    }

    public executeForTick(): void {
        this.entered_tick += 1;

        const sink_state = this.sink_entity_state;
        
        if (EntityState.isBelt(sink_state)) {
            this.dropOffToBelt(this.inserterState);
        }

        if (EntityState.isMachine(sink_state)) {
            this.dropOffToMachine(this.inserterState, sink_state);
        }

        if (this.dropDurationHasPassed()) {
            assert(
                (this.inserterState.held_item?.quantity ?? 0) === 0, 
                `Held item quantity should be 0 but was ${this.inserterState.held_item?.quantity} after drop duration`
            )
            this.inserterState.held_item = null;
            this.inserterState.status = InserterStatus.SWING_TO_SOURCE;
        }
    }

    private dropOffToBelt(inserter_state: InserterState): void {        
        // remove 4 items per tick to the belt over the drop duration
        const held_item = inserter_state.held_item;
        assert(held_item !== null, "Held item should not be null when dropping off to belt");

        inserter_state.inventoryState.removeQuantity(held_item.item_name, 4);
        held_item.quantity -= 4;
        return;
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
        return;
    }

    private dropDurationHasPassed(): boolean {
        const drop_ticks = this.inserterState.inserter.animation.drop.ticks;
        return this.entered_tick >= drop_ticks;
    }

    private get sink_entity_state(): EntityState {
        return this.entityStateRegistry.getStateByEntityIdOrThrow(this.inserterState.inserter.sink.entity_id);
    }

}