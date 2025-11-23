import { EntityType } from "../entity-type";
import { Inserter } from "./inserter";

export interface ReadableInserterRegistry {
    hasInserter(inserterId: number): boolean;
    getInserterById(inserterId: number): Inserter | null;
    getInserterByIdOrThrow(inserterId: number): Inserter;
    getAllInserters(): Inserter[];
    getInsertersForMachine(machineId: number): Inserter[];
}

export interface WritableInserterRegistry extends ReadableInserterRegistry {
    createNewInserter(inserter: Inserter): number;
    setInserter(inserterId: number, inserter: Inserter): void;
    removeInserter(inserterId: number): void;
}

export class InserterRegistry implements WritableInserterRegistry {
    private inserters: Map<number, Inserter> = new Map();

    public hasInserter(inserterId: number): boolean {
        return this.inserters.has(inserterId);
    }

    public getInserterById(inserterId: number): Inserter | null {
        return this.inserters.get(inserterId) ?? null;
    }

    public getInserterByIdOrThrow(inserterId: number): Inserter {
        const inserter = this.getInserterById(inserterId);
        if (!inserter) {
            throw new Error(`Inserter with ID ${inserterId} does not exist`);
        }
        return inserter;
    }

    public getAllInserters(): Inserter[] {
        return Array.from(this.inserters.values());
    }

    public getInsertersForMachine(machineId: number): Inserter[] {
        return this.getAllInserters().filter(
            inserter => inserter.source.entity_type === EntityType.MACHINE && inserter.source.entity_id === machineId ||
                        inserter.sink.entity_type === EntityType.MACHINE && inserter.sink.entity_id === machineId
        );
    }
    public createNewInserter(inserter: Inserter): number {
        const newId = this.inserters.size > 0 ? Math.max(...this.inserters.keys()) + 1 : 1;
        inserter.id = newId;
        this.inserters.set(newId, inserter);
        return newId;
    }

    public setInserter(inserterId: number, inserter: Inserter): void {
        if (!this.inserters.has(inserterId)) {
            throw new Error(`Inserter with ID ${inserterId} does not exist`);
        }
        inserter.id = inserterId;
        this.inserters.set(inserterId, inserter);
    }

    public removeInserter(inserterId: number): void {
        if (!this.inserters.delete(inserterId)) {
            throw new Error(`Inserter with ID ${inserterId} does not exist`);
        }
    }
}