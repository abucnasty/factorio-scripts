import { Machine } from "./machine";

export interface ReadableMachineRegistry {
    hasMachine(machineId: number): boolean;
    getMachineByRecipeOrThrow(recipe_name: string): Machine;
    getMachineById(machineId: number): Machine | null;
    getMachineByIdOrThrow(machineId: number): Machine;
    getAllMachines(): Machine[];
}

export interface WritableMachineRegistry extends ReadableMachineRegistry {
    setMachine(machine: Machine): void;
    removeMachine(machineId: number): void;
}

export class MachineRegistry implements WritableMachineRegistry {
    private machinesById: Map<number, Machine> = new Map();
    private machinesByRecipe: Map<string, Set<number>> = new Map();

    public setMachine(machine: Machine): void {
        this.machinesById.set(machine.id, machine);
        
        if (!this.machinesByRecipe.has(machine.metadata.recipe.name)) {
            this.machinesByRecipe.set(machine.metadata.recipe.name, new Set());
        }
        this.machinesByRecipe.get(machine.metadata.recipe.name)!.add(machine.id);
    }

    public removeMachine(machineId: number): void {
        const machine = this.machinesById.get(machineId);
        if (machine) {
            this.machinesById.delete(machineId);
            const recipeSet = this.machinesByRecipe.get(machine.metadata.recipe.name);
            if (recipeSet) {
                recipeSet.delete(machineId);
                if (recipeSet.size === 0) {
                    this.machinesByRecipe.delete(machine.metadata.recipe.name);
                }
            }
        }
    }

    public hasMachine(machineId: number): boolean {
        return this.machinesById.has(machineId);
    }

    public getMachineById(machineId: number): Machine | null {
        return this.machinesById.get(machineId) ?? null;
    }

    public getMachineByIdOrThrow(machineId: number): Machine {
        const machine = this.getMachineById(machineId);
        if (!machine) {
            throw new Error(`Machine with id ${machineId} not found`);
        }
        return machine;
    }

    public getMachineByRecipeOrThrow(recipe_name: string): Machine {
        const machineIds = this.machinesByRecipe.get(recipe_name);
        if (!machineIds || machineIds.size === 0) {
            throw new Error(`No machines found for recipe ${recipe_name}`);
        }
        if (machineIds.size > 1) {
            throw new Error(`Expected exactly one machine for recipe ${recipe_name}, but found ${machineIds.size}`);
        }
        return this.machinesById.get(Array.from(machineIds)[0])!;
    }

    public getAllMachines(): Machine[] {
        return Array.from(this.machinesById.values());
    }

    public clear(): void {
        this.machinesById.clear();
        this.machinesByRecipe.clear();
    }
}
