import { RecipeMetadata } from "./recipe";

export interface MachineMetadata {
    productivity: number;
    crafting_speed: number;
    recipe: RecipeMetadata;
}