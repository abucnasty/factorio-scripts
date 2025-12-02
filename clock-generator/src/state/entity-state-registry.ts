import { EntityId, ReadableEntityRegistry } from "../entities";
import { EntityState } from "./entity-state";
import assert from "assert";

export interface ReadableEntityStateRegistry {
    hasStateForEntity(entityId: EntityId): boolean;
    getStateByEntityId<T extends EntityState>(entityId: EntityId): T | null;
    getStateByEntityIdOrThrow<T extends EntityState>(entityId: EntityId): T;
    getAllStates<T extends EntityState>(): T[];
}

export interface WritableEntityStateRegistry extends ReadableEntityStateRegistry {
    addState<T extends EntityState>(state: T): void;
    addStates(states: EntityState[]): this;
}

export class EntityStateRegistry implements WritableEntityStateRegistry {
    private states: Map<string, EntityState> = new Map();

    constructor(
        private readonly entityRegistry: ReadableEntityRegistry,
    ) {}
    
    public hasStateForEntity(entityId: EntityId): boolean {
        return this.states.has(entityId.id);
    }
    public getStateByEntityId<T extends EntityState>(entityId: EntityId): T | null {
        return (this.states.get(entityId.id) as T) ?? null;
    }

    public getStateByEntityIdOrThrow<T extends EntityState>(entityId: EntityId): T {
        const state = this.getStateByEntityId<T>(entityId);
        if (!state) {
            throw new Error(`State for entity with ID ${entityId.id} does not exist`);
        }
        return state;
    }

    public getAllStates<T extends EntityState>(): T[] {
        return Array.from(this.states.values()) as T[];
    }

    public addState<T extends EntityState>(state: T): void {
        const entity = this.entityRegistry.getEntityById(state.entity_id);
        assert(entity != null, `Cannot add state for non-existent entity with ID ${state.entity_id.id}`);
        this.states.set(state.entity_id.id, state);
    }

    public addStates(states: EntityState[]): this {
        states.forEach(state => this.addState(state));
        return this;
    }
}