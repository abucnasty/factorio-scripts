import { sin } from "mathjs";
import { EntityType, Inserter } from "../entities";
import { BeltState } from "../state/belt-state";
import { EntityState } from "../state/entity-state";
import { EntityStateRegistry } from "../state/entity-state-registry";
import { InserterState, InserterStatus } from "../state/inserter-state";
import { MachineState } from "../state/machine-state";
import { ControlLogic } from "./control-logic";
import { ItemName } from "../data/factorio-data-types";

export type InserterStateLogicArgs<SRC = EntityState, SINK = EntityState> = { state: InserterState, source: EntityState, sink: EntityState }
export type InserterStateLogic = (args: InserterStateLogicArgs) => InserterStatus;

const InserterStateLogic: ReadonlyMap<InserterStatus, InserterStateLogic> = new Map([
    [InserterStatus.IDLE, idle],
    [InserterStatus.PICKUP, pickup],
    [InserterStatus.DROP_OFF, drop],
    [InserterStatus.SWING_TO_SINK, swing],
    [InserterStatus.SWING_TO_SOURCE, swing],
]);

export type InsertertStateChangeListener = (
    args: { state: InserterState, status: { from: InserterStatus, to: InserterStatus } }
) => void;

export class InserterStateMachine implements ControlLogic {

    private readonly listeners: InsertertStateChangeListener[] = [];

    constructor(
        private readonly state: InserterState,
        private readonly stateRegistry: EntityStateRegistry,
    ) { }

    public executeForTick(): void {
        const current_status = this.state.status;
        const logic = InserterStateLogic.get(this.state.status)!;

        const next: InserterStatus = logic({
            state: this.state,
            source: this.source_entity_state,
            sink: this.sink_entity_state
        });

        if (next !== current_status) {
            for (const listener of this.listeners) {
                listener({ state: InserterState.clone(this.state), status: { from: current_status, to: next } });
            }
        }

        setInserterStateStatus(this.state, next);
    }

    public registerStateChangeListener(listener: InsertertStateChangeListener): void {
        this.listeners.push(listener);
    }

    private get source_entity_state(): EntityState {
        return this.stateRegistry.getStateByEntityIdOrThrow(this.state.inserter.source.entity_id);
    }

    private get sink_entity_state(): EntityState {
        return this.stateRegistry.getStateByEntityIdOrThrow(this.state.inserter.sink.entity_id);
    }

}

/**
 * advance internal state to next status and increment tick
 */
function setInserterStateStatus(state: InserterState, status: InserterStatus): void {
    state.status = status;
    state.tick += 1;
}

/**
 * can transition to pickup or remain idle
 */
function idle(args: InserterStateLogicArgs): InserterStatus {
    const { state, source, sink } = args;

    if (entityAcceptsSomeItem(state, sink) && canPickupFromEntity(state, source)) {
        return InserterStatus.PICKUP;
    }

    return InserterStatus.IDLE;
}

function heldItemName(inserter: InserterState): ItemName | null {
    if (inserter.held_item != null) {
        return inserter.held_item.item_name;
    }
    return null;
}

function canPickupItem(inserter: InserterState, itemName: ItemName): boolean {
    if (inserter.inserter.filtered_items.size === 0) {
        return true;
    }
    return inserter.inserter.filtered_items.has(itemName);
}

function isHoldingItem(inserter: InserterState): boolean {
    return inserter.held_item != null;
}

function canPickupFromEntity(inserter: InserterState, entity: EntityState): boolean {

    if (entity.entity_id.type === EntityType.BELT) {
        return true;
    }

    if (entity.entity_id.type === EntityType.MACHINE) {
        const machine_state = entity as MachineState;
        const output_item_name = machine_state.machine.output.ingredient.name;
        const output_quantity = machine_state.inventoryState.getQuantity(output_item_name);
        // TODO: this should be configurable, setting to stack size for now
        const output_threshold = inserter.inserter.metadata.stack_size;
        if (output_quantity >= output_threshold && canPickupItem(inserter, output_item_name)) {
            return true;
        }
    }

    return false;
}

function entityAcceptsSomeItem(inserter_state: InserterState, entity: EntityState): boolean {

    if (entity.entity_id.type === EntityType.BELT) {
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
    if (entity.entity_id.type === EntityType.MACHINE) {
        return !MachineState.machineInputIsBlocked(entity as MachineState, item_name);
    }

    if (entity.entity_id.type === EntityType.BELT) {
        return true;
    }

    return false;
}

function heldItemQuantity(state: InserterState): number {
    if (state.held_item != null) {
        return state.held_item.quantity;
    }
    return 0;
}

/**
 * can transition to swing or remain pickup
 */
function pickup(args: InserterStateLogicArgs): InserterStatus {
    const { state, source, sink } = args;

    if (source.entity_id.type === EntityType.MACHINE) {
        pickup_from_machine(state, source as MachineState);
    }

    if (source.entity_id.type === EntityType.BELT) {
        pickup_from_belt(state, source as BeltState, sink as MachineState);
    }

    if (heldItemQuantity(state) == state.inserter.metadata.stack_size) {
        return InserterStatus.SWING_TO_SINK;
    }

    return InserterStatus.PICKUP;
}

function pickup_from_machine(state: InserterState, source: MachineState): void {
    throw new Error("::pickup_from_machine not implemented... yet");
}

function pickup_from_belt(state: InserterState, source: BeltState, sink: MachineState): void {
    const item_to_pickup = determineItemToPickup(state, source, sink);
}

function acceptedItemNames(state: InserterState, entity: EntityState): Set<ItemName> {

    const item_names = new Set<ItemName>();

    if(!entityAcceptsSomeItem(state, entity)) {
        return item_names;
    }

    for(const item_name of state.inserter.filtered_items) {
        if(entityAcceptsItem(entity, item_name)) {
            item_names.add(item_name);
        }
    }

    return item_names;
}

function determineItemToPickup(state: InserterState, source: EntityState, sink: EntityState): ItemName {

    const held_item = heldItemName(state);
    if (held_item != null) {
        return held_item;
    }

    const accepted_items = acceptedItemNames(state, sink);

    for (const item_name of accepted_items) {

    }

}

function drop(args: InserterStateLogicArgs): InserterStatus {
    const { state, source, sink } = args;
    return state.status
}

const dropToBelt: InserterStateLogic = (args: InserterStateLogicArgs): InserterStatus => {
    const { state, source, sink } = args;
    return state.status;
}

const dropToMachine: InserterStateLogic = (args: InserterStateLogicArgs): InserterStatus => {
    const { state, source, sink } = args;
    return state.status;
}

/**
 * 
 * can transition to either swing, drop, idle, or pickup
 */
function swing(args: InserterStateLogicArgs): InserterStatus {
    const { state, source, sink } = args;
    const last_tick = state.tick;

    return state.status;

}