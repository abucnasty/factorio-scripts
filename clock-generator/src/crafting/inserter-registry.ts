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
    private insertersById: Map<number, Inserter> = new Map();
    private insertersByMachine: Map<number, Set<number>> = new Map();
    private nextId: number = 0;

    public createNewInserter(inserter: Inserter): number {
        const id = this.nextId++;
        inserter.setId(id);
        this.setInserter(id, inserter);
        return id;
    }

    public setInserter(inserterId: number, inserter: Inserter): void {
        this.insertersById.set(inserterId, inserter);
        
        if (inserter.source.type === "machine" && inserter.source.machine_id !== undefined) {
            if (!this.insertersByMachine.has(inserter.source.machine_id)) {
                this.insertersByMachine.set(inserter.source.machine_id, new Set());
            }
            this.insertersByMachine.get(inserter.source.machine_id)!.add(inserterId);
        }
        
        if (inserter.target.type === "machine" && inserter.target.machine_id !== undefined) {
            if (!this.insertersByMachine.has(inserter.target.machine_id)) {
                this.insertersByMachine.set(inserter.target.machine_id, new Set());
            }
            this.insertersByMachine.get(inserter.target.machine_id)!.add(inserterId);
        }
    }

    public removeInserter(inserterId: number): void {
        const inserter = this.insertersById.get(inserterId);
        if (inserter) {
            this.insertersById.delete(inserterId);
            
            if (inserter.source.type === "machine" && inserter.source.machine_id !== undefined) {
                const sourceSet = this.insertersByMachine.get(inserter.source.machine_id);
                if (sourceSet) {
                    sourceSet.delete(inserterId);
                    if (sourceSet.size === 0) {
                        this.insertersByMachine.delete(inserter.source.machine_id);
                    }
                }
            }
            
            if (inserter.target.type === "machine" && inserter.target.machine_id !== undefined) {
                const targetSet = this.insertersByMachine.get(inserter.target.machine_id);
                if (targetSet) {
                    targetSet.delete(inserterId);
                    if (targetSet.size === 0) {
                        this.insertersByMachine.delete(inserter.target.machine_id);
                    }
                }
            }
        }
    }

    public hasInserter(inserterId: number): boolean {
        return this.insertersById.has(inserterId);
    }

    public getInserterById(inserterId: number): Inserter | null {
        return this.insertersById.get(inserterId) ?? null;
    }

    public getInserterByIdOrThrow(inserterId: number): Inserter {
        const inserter = this.getInserterById(inserterId);
        if (!inserter) {
            throw new Error(`Inserter with id ${inserterId} not found`);
        }
        return inserter;
    }

    public getAllInserters(): Inserter[] {
        return Array.from(this.insertersById.values());
    }

    public getInsertersForMachine(machineId: number): Inserter[] {
        const inserterIds = this.insertersByMachine.get(machineId);
        if (!inserterIds) {
            return [];
        }
        return Array.from(inserterIds)
            .map(id => this.insertersById.get(id)!)
            .filter(inserter => inserter !== undefined);
    }

    public clear(): void {
        this.insertersById.clear();
        this.insertersByMachine.clear();
        this.nextId = 0;
    }
}