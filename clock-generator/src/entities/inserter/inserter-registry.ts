import { EntityId } from "../entity-id";
import { ReadableEntityRegistry } from "../entity-registry";
import { EntityType } from "../entity-type";
import { Inserter } from "./inserter";

export interface ReadableInserterRegistry {
    hasInserter(inserterId: number): boolean;
    getInserterById(inserterId: number): Inserter | null;
    getInserterByIdOrThrow(inserterId: number): Inserter;
    getAllInserters(): Inserter[];
    getInsertersForMachine(machineId: EntityId): Inserter[];
}

export class InserterRegistry implements ReadableInserterRegistry {
    
    constructor(
        private entityRegistry: ReadableEntityRegistry
    ) {}

    public hasInserter(inserterId: number): boolean {
        return this.entityRegistry.hasEntity(EntityId.forInserter(inserterId));
    }

    public getInserterById(inserterId: number): Inserter | null {
        return this.entityRegistry.getEntityById(EntityId.forInserter(inserterId)) as Inserter | null;
    }

    public getInserterByIdOrThrow(inserterId: number): Inserter {
        const inserter = this.getInserterById(inserterId);
        if (!inserter) {
            throw new Error(`Inserter with ID ${inserterId} does not exist`);
        }
        return inserter;
    }

    public getAllInserters(): Inserter[] {
        return this.entityRegistry.getAll().filter(it => it.entity_id.type === EntityType.INSERTER) as Inserter[];
    }

    public getInsertersForMachine(machineId: EntityId): Inserter[] {
        return this.getAllInserters().filter(
            inserter => 
                inserter.source.entity_id.id === machineId.id ||
                inserter.sink.entity_id.id === machineId.id
        );
    }
}