import { EntityType } from "../entities";
import { EntityId } from "../entities/entity-id";
import { BeltState } from "./belt-state";
import { DrillState } from "./drill-state";
import { InserterState } from "./inserter-state";
import { WritableInventoryState } from "./inventory-state";
import { MachineState } from "./machine-state";

export interface EntityState {
    entity_id: EntityId;
    inventoryState: WritableInventoryState;
}


export function isBelt(state: EntityState): state is BeltState {
    return EntityId.isBelt(state.entity_id);
}

export function isMachine(state: EntityState): state is MachineState {
    return EntityId.isMachine(state.entity_id);
}

export function isInserter(state: EntityState): state is InserterState {
    return EntityId.isInserter(state.entity_id);
}

export function isDrill(state: EntityState): state is DrillState {
    return EntityId.isDrill(state.entity_id);
}

export const EntityState = {
    isBelt: isBelt,
    isMachine: isMachine,
    isInserter: isInserter,
    isDrill: isDrill,
}