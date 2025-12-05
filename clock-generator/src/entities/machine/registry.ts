import { EntityId } from "../entity-id";
import { ReadableEntityRegistry } from "../entity-registry";
import { EntityType } from "../entity-type";
import { Machine } from "./machine";

export interface ReadableMachineRegistry {
    hasMachine(machineId: number): boolean;
    getMachineByRecipeOrThrow(recipe_name: string): Machine;
    getMachineById(machineId: number): Machine | null;
    getMachineByIdOrThrow(machineId: number): Machine;
    getAllMachines(): Machine[];
}

/**
 * @deprecated Use EntityRegistry directly
 */
export class MachineRegistry implements ReadableMachineRegistry {
    constructor(private readonly entityRegistry: ReadableEntityRegistry) { }

    public hasMachine(machineId: number): boolean {
        return this.entityRegistry.hasEntity(EntityId.forMachine(machineId));
    }

    public getMachineById(machineId: number): Machine | null {
        return this.entityRegistry.getEntityById(EntityId.forMachine(machineId)) as Machine | null;
    }

    public getMachineByIdOrThrow(machineId: number): Machine {
        const machine = this.getMachineById(machineId);
        if (!machine) {
            throw new Error(`Machine with id ${machineId} not found`);
        }
        return machine;
    }

    public getMachineByRecipeOrThrow(recipe_name: string): Machine {

        const machines = this.getAllMachines().filter(it => it.metadata.recipe.name === recipe_name);
        if (!machines || machines.length === 0) {
            throw new Error(`No machines found for recipe ${recipe_name}`);
        }

        if (machines.length > 1) {
            throw new Error(`Expected exactly one machine for recipe ${recipe_name}, but found ${machines.length}`);
        }
        return machines[0];
    }

    public getAllMachines(): Machine[] {
        return this.entityRegistry.getAll().filter(it => it.entity_id.type === EntityType.MACHINE) as Machine[];
    }
}
