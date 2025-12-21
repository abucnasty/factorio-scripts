import { ItemName } from "../../data";
import { EntityId } from "../entity-id";
import { ReadableEntityRegistry } from "../entity-registry";
import { EntityType } from "../entity-type";
import { Belt } from "./belt";

export interface ReadableBeltRegistry {
    getBeltById(beltId: number): Belt | null;
    getBeltByIdOrThrow(beltId: number): Belt;
    getAllBelts(): Belt[];
    getBeltsForIngredient(ingredientName: ItemName): Belt[];
}

/**
 * @deprecated Use EntityRegistry directly
 */
export class BeltRegistry implements ReadableBeltRegistry {
    

    constructor(
        private readonly entityRegistry: ReadableEntityRegistry
    ) {}

    public getBeltById(beltId: number): Belt | null {
        return this.entityRegistry.getEntityById(EntityId.forBelt(beltId)) as Belt || null;
    }

    public getBeltByIdOrThrow(beltId: number): Belt {
        const belt = this.getBeltById(beltId);
        if (!belt) {
            throw new Error(`Belt with ID ${beltId} not found.`);
        }
        return belt;
    }

    public getAllBelts(): Belt[] {
        return this.entityRegistry.getAll().filter(entity => entity.entity_id.type === EntityType.BELT) as Belt[];
    }
    public getBeltsForIngredient(ingredientName: ItemName): Belt[] {
        const belts = this.getAllBelts().filter(it => it.lanes.some(lane => lane.ingredient_name === ingredientName));
        return belts;
    }
}