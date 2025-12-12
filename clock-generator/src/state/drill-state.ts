import { EntityId, MiningDrill } from "../entities";
import { EntityState } from "./entity-state";
import { InventoryState, WritableInventoryState } from "./inventory-state";

export const DrillStatus = {
    WORKING: 'WORKING',
    DISABLED: 'DISABLED',
} as const;

export type DrillStatus = typeof DrillStatus[keyof typeof DrillStatus];

export interface DrillState extends EntityState {
    drill: MiningDrill
    inventoryState: WritableInventoryState
    status: DrillStatus
}


function fromMiningDrillEntity(drill: MiningDrill): DrillState {
    return {
        entity_id: drill.entity_id,
        status: DrillStatus.WORKING,
        drill: drill,
        inventoryState: InventoryState.createEmptyForSingleItem(drill.production_rate.item),
    }
}

export const DrillState = {
    fromEntity: fromMiningDrillEntity
}