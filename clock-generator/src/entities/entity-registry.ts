import assert from "../common/assert";
import { MapExtended } from "../data-types";
import { Entity } from "./entity";
import { EntityId } from "./entity-id";

export interface ReadableEntityRegistry {
    hasEntity(entity_id: EntityId): boolean;
    getEntityById(entity_id: EntityId): Entity | null;
    getEntityByIdOrThrow<T extends Entity = Entity>(entity_id: EntityId): T;
    getSourceEntity(entity_id: EntityId): Entity | null;
    getSourceEntityOrThrow(entity_id: EntityId): Entity;
    getSinkEntity(entity_id: EntityId): Entity | null;
    getSinkEntityOrThrow(entity_id: EntityId): Entity;
    getAll(): Entity[];
}

export interface WritableEntityRegistry extends ReadableEntityRegistry {
    add(entity: Entity): void;
    remove(entity_id: EntityId): void;
}

export class EntityRegistry extends MapExtended<string, Entity> implements WritableEntityRegistry {

    public hasEntity(entity_id: EntityId): boolean {
        return this.has(entity_id.id);
    }

    public getEntityById<T extends Entity>(entity_id: EntityId): T | null {
        return this.get(entity_id.id) as T ?? null;
    }

    public getEntityByIdOrThrow<T extends Entity>(entity_id: EntityId): T {
        const entity = this.getEntityById(entity_id);
        if (!entity) {
            throw new Error(`Entity with ID ${entity_id.id} does not exist`);
        }
        return entity as T;
    }
    
    public getAll(): Entity[] {
        return this.values_array();
    }

    public add(entity: Entity): EntityId {
        this.set(entity.entity_id.id, entity);
        return entity.entity_id;
    }
    
    public remove(entity_id: EntityId): void {
        this.delete(entity_id.id);
    }

    public getSourceEntity(entity_id: EntityId): Entity | null {
        const entity = this.getEntityByIdOrThrow(entity_id);

        if (Entity.isInserter(entity)) {
            return this.getEntityByIdOrThrow(entity.source.entity_id);
        }

        return null
    }

    public getSinkEntity(entity_id: EntityId): Entity | null {
        const entity = this.getEntityByIdOrThrow(entity_id);

        if (Entity.isInserter(entity)) {
            return this.getEntityByIdOrThrow(entity.sink.entity_id);
        }

        if (Entity.isDrill(entity)) {
            return this.getEntityByIdOrThrow(entity.sink_id)
        }

        return null
    }

    public getSourceEntityOrThrow(entity_id: EntityId): Entity {
        const entity = this.getSourceEntity(entity_id);
        assert(entity !== null, `Source entity for ID ${entity_id} does not exist`);
        return entity;
    }

    public getSinkEntityOrThrow(entity_id: EntityId): Entity {
        const entity = this.getSinkEntity(entity_id);
        assert(entity !== null, `Sink entity for ID ${entity_id} does not exist`);
        return entity;
    }
}