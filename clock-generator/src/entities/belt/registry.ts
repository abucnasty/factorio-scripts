import { ItemName } from "../../data/factorio-data-types";
import { Belt } from "./belt";

export interface ReadableBeltRegistry {
    getBeltById(beltId: number): Belt | null;
    getBeltByIdOrThrow(beltId: number): Belt;
    getAllBelts(): Belt[];
    getBeltForIngredient(ingredientName: ItemName): Belt | null;
    getBeltForIngredientOrThrow(ingredientName: ItemName): Belt;
}

export interface WritableBeltRegistry extends ReadableBeltRegistry {
    setBelt(beltId: number, belt: Belt): void;
    removeBelt(beltId: number): void;
}

export class BeltRegistry implements WritableBeltRegistry {
    private beltsById: Map<number, Belt> = new Map();
    private beltsByIngredient: Map<ItemName, number> = new Map();

    public setBelt(beltId: number, belt: Belt): void {
        this.beltsById.set(beltId, belt);

        belt.lanes.forEach((lane) => {
            this.beltsByIngredient.set(lane.ingredient_name, beltId);
        });
    }

    public removeBelt(beltId: number): void {
        const belt = this.beltsById.get(beltId);
        if (belt) {
            this.beltsById.delete(beltId);
            belt.lanes.forEach((lane) => {
                this.beltsByIngredient.delete(lane.ingredient_name);
            });
        }
    }

    public getBeltById(beltId: number): Belt | null {
        return this.beltsById.get(beltId) || null;
    }

    public getBeltByIdOrThrow(beltId: number): Belt {
        const belt = this.getBeltById(beltId);
        if (!belt) {
            throw new Error(`Belt with ID ${beltId} not found.`);
        }
        return belt;
    }

    public getAllBelts(): Belt[] {
        return Array.from(this.beltsById.values());
    }
    public getBeltForIngredient(ingredientName: ItemName): Belt | null {
        const beltId = this.beltsByIngredient.get(ingredientName);
        if (beltId === undefined) {
            return null;
        }
        return this.getBeltById(beltId);
    }

    public getBeltForIngredientOrThrow(ingredientName: ItemName): Belt {
        const belt = this.getBeltForIngredient(ingredientName);
        if (!belt) {
            throw new Error(`Belt for ingredient ${ingredientName} not found.`);
        }
        return belt;
    }
}