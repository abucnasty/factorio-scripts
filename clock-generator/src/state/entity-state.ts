import { EntityType } from "../entities";
import { EntityId } from "../entities/entity-id";
import { BeltState } from "./belt-state";
import { InserterState } from "./inserter-state";
import { WritableInventoryState } from "./inventory-state";
import { MachineState } from "./machine-state";

export interface EntityState {
    entity_id: EntityId;
    inventoryState: WritableInventoryState;
}


export function isBelt(state: EntityState): state is BeltState {
    return state.entity_id.type === EntityType.BELT;
}

export function isMachine(state: EntityState): state is MachineState {
    return state.entity_id.type === EntityType.MACHINE;
}

export function isInserter(state: EntityState): state is InserterState {
    return state.entity_id.type === EntityType.INSERTER;
}

export const EntityState = {
    isBelt: isBelt,
    isMachine: isMachine,
    isInserter: isInserter,
}