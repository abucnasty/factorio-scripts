import { Belt } from "../entities"
import { BeltInventoryState } from "./belt-inventory-state"
import { EntityState } from "./entity-state"

export interface BeltState extends EntityState {
    belt: Belt
    inventoryState: BeltInventoryState
}


function fromBelt(belt: Belt): BeltState {
    return {
        entity_id: belt.entity_id,
        belt: belt,
        inventoryState: BeltInventoryState.fromBelt(belt),
    }
}

export const BeltState = {
    create: fromBelt,
}