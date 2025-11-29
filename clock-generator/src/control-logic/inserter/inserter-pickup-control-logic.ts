import { ItemName } from "../../data/factorio-data-types";
import { BeltState } from "../../state/belt-state";
import { EntityState } from "../../state/entity-state";
import { ReadableEntityStateRegistry } from "../../state/entity-state-registry";
import { InserterState, InserterStatus } from "../../state/inserter-state";
import { MachineState } from "../../state/machine-state";
import { InserterStateControlLogic } from "./inserter-state-control-logic";
import assert from "assert";

export class InserterPickupControlLogic implements InserterStateControlLogic {

    constructor(
        private readonly inserterState: InserterState,
        private readonly entityStateRegistry: ReadableEntityStateRegistry,
    ) { }

    private current_tick: number = 0;

    public onEnter(): void {
        // no-op
    }

    public onExit(): void {
        this.current_tick = 0;
    }

    public executeForTick(): void {

        assert(
            this.inserterState.status === InserterStatus.PICKUP,
            `InserterPickupControlLogic can only be executed in PICKUP state, current state: ${this.inserterState.status}`
        );

        if (!canPickupFromEntity(this.inserterState, this.source_entity_state)) {
            // cannot pickup, go idle
            this.inserterState.status = InserterStatus.IDLE;
            return;
        }

        this.current_tick += 1;

        const source = this.source_entity_state;
        if (EntityState.isBelt(source)) {
            this.pickupFromBelt(this.inserterState, source);
        }
        if (EntityState.isMachine(source)) {
            this.pickupFromMachine(this.inserterState, source);
        }

        if(this.hasPickupDurationElapsed()) {
            // pickup complete
            this.inserterState.status = InserterStatus.SWING_TO_SINK;
            return;
        }
    }

    private pickupFromBelt(inserter_state: InserterState, source: BeltState): void {
        
        const sink = this.sink_entity_state;

        if(!EntityState.isMachine(sink)) {
            throw new Error("Inserter sink is not a machine");
        }
        
        const held_item = inserter_state.held_item

        if (held_item) {
            // pickup 4 items from belt per tick
            held_item.quantity += 4;
            inserter_state.inventoryState.addQuantity(held_item.item_name, 4);
            return;
        }

        for (const item_name of inserter_state.inserter.filtered_items) {
            if(!MachineState.machineInputIsBlocked(sink, item_name)) {
                inserter_state.held_item = { item_name: item_name, quantity: 4 };
                inserter_state.inventoryState.addQuantity(item_name, 4);
                return;
            }
        }
    }

    private pickupFromMachine(state: InserterState, source: MachineState): void {
        throw new Error("pickupFromMachine not implemented yet");
    }

    private hasPickupDurationElapsed(): boolean {
        return this.current_tick >= this.inserterState.inserter.animation.pickup.ticks;
    }

    private get source_entity_state(): EntityState {
        return this.entityStateRegistry.getStateByEntityIdOrThrow(this.inserterState.inserter.source.entity_id);
    }

    private get sink_entity_state(): EntityState {
        return this.entityStateRegistry.getStateByEntityIdOrThrow(this.inserterState.inserter.sink.entity_id);
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
        const output_threshold = inserter_state.inserter.metadata.stack_size;
        if (output_quantity >= output_threshold && canPickupItem(inserter_state, output_item_name)) {
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