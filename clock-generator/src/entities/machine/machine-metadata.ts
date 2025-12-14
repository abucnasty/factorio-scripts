import { RecipeMetadata } from "./recipe";

export type MachineType = "machine" | "furnace";

export interface MachineMetadata {
    productivity: number;
    crafting_speed: number;
    recipe: RecipeMetadata;
    type: MachineType;
}