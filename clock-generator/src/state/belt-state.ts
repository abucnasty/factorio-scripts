import { Belt } from "../entities"
import { BeltInventoryState } from "./belt-inventory-state"
import { EntityState } from "./entity-state"

export interface BeltState extends EntityState {
    belt: Belt
    inventoryState: BeltInventoryState
}