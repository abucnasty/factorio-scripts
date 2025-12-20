import { RecipeMetadata } from "./recipe";

export const MachineType = {
    MACHINE: "machine",
    FURNACE: "furnace",
} as const

export type MachineType = typeof MachineType[keyof typeof MachineType];

export interface MachineMetadata {
    productivity: number;
    crafting_speed: number;
    recipe: RecipeMetadata;
    type: MachineType;
}