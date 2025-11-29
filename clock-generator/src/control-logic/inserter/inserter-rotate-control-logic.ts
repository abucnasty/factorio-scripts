import { ReadableEntityStateRegistry } from "../../state/entity-state-registry";
import { InserterState, InserterStatus } from "../../state/inserter-state";
import assert from "assert";
import { InserterStateControlLogic } from "./inserter-state-control-logic";
import { EntityState } from "../../state/entity-state";
import { ItemName } from "../../data/factorio-data-types";
import { MachineState } from "../../state/machine-state";

export class InserterRotateControlLogic implements InserterStateControlLogic {

    private readonly accepted_statuses = new Set<InserterStatus>([
        InserterStatus.SWING_TO_SINK,
        InserterStatus.SWING_TO_SOURCE
    ]);

    private current_tick = 0;

    constructor(
        private readonly inserterState: InserterState,
        private readonly entityStateRegistry: ReadableEntityStateRegistry,
    ) { }

    public onEnter(): void {
        this.current_tick = 0;
    }

    public onExit(): void {
        // no-op
    }

    public executeForTick(): void {

        assert(
            this.accepted_statuses.has(this.inserterState.status),
            `InserterRotateControlLogic can only be executed in ${this.accepted_statuses} states, current state: ${this.inserterState.status}`
        );
        this.current_tick += 1;
        this.rotate();
    }

    private rotate(): void {
        const total_rotate_ticks = this.inserterState.inserter.animation.rotation.ticks;

        const current_status = this.inserterState.status;
        
        if (this.current_tick >= total_rotate_ticks) {
            switch(current_status) {
                case InserterStatus.SWING_TO_SINK:
                    this.inserterState.status = InserterStatus.DROP_OFF;
                    return;;
                case InserterStatus.SWING_TO_SOURCE:
                    if(!entityAcceptsSomeItem(this.inserterState, this.sink_entity_state)) {
                        // cannot insert into sink, go idle
                        this.inserterState.status = InserterStatus.IDLE;
                        return;
                    }
                    if (!canPickupFromEntity(this.inserterState, this.source_entity_state)) {
                        // cannot pickup from source, go idle
                        this.inserterState.status = InserterStatus.IDLE;
                        return;
                    }
                    this.inserterState.status = InserterStatus.PICKUP;
                    return;
            }
        }
    }

    private get source_entity_state(): EntityState {
        const source_state = this.entityStateRegistry.getStateByEntityId(this.inserterState.inserter.source.entity_id);
        assert(source_state !== null, `Source entity state not found for inserter: ${this.inserterState.inserter.entity_id.id}`);
        return source_state;
    }

    private get sink_entity_state(): EntityState {
        const sink_state = this.entityStateRegistry.getStateByEntityId(this.inserterState.inserter.sink.entity_id);
        assert(sink_state !== null, `Sink entity state not found for inserter: ${this.inserterState.inserter.entity_id.id}`);
        return sink_state;
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

function entityAcceptsSomeItem(inserter_state: InserterState, entity: EntityState): boolean {

    if (EntityState.isBelt(entity)) {
        return true;
    }


    for (const item_name of inserter_state.inserter.filtered_items) {
        if (entityAcceptsItem(entity, item_name)) {
            return true;
        }
    }

    return false;
}

function entityAcceptsItem(entity: EntityState, item_name: ItemName): boolean {
    if (EntityState.isMachine(entity)) {
        return !MachineState.machineInputIsBlocked(entity as MachineState, item_name);
    }

    if (EntityState.isBelt(entity)) {
        return true;
    }

    return false;
}