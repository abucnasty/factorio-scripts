import { Entity } from "./entity";
import { EntityId } from "./entity-id";

export interface ReadableEntityRegistry {
    hasEntity(entityId: EntityId): boolean;
    getEntityById(entityId: EntityId): Entity | null;
    getEntityByIdOrThrow(entityId: EntityId): Entity;
    getAll(): Entity[];
}

export interface WritableEntityRegistry extends ReadableEntityRegistry {
    add(entity: Entity): void;
    remove(entityId: EntityId): void;
}

export class EntityRegistry implements WritableEntityRegistry {
    private entities: Map<string, Entity> = new Map();

    public hasEntity(entityId: EntityId): boolean {
        return this.entities.has(entityId.id);
    }

    public getEntityById(entityId: EntityId): Entity | null {
        return this.entities.get(entityId.id) ?? null;
    }

    public getEntityByIdOrThrow(entityId: EntityId): Entity {
        const entity = this.getEntityById(entityId);
        if (!entity) {
            throw new Error(`Entity with ID ${entityId.id} does not exist`);
        }
        return entity;
    }
    
    public getAll(): Entity[] {
        return Array.from(this.entities.values());
    }

    public add(entity: Entity): EntityId {
        this.entities.set(entity.entity_id.id, entity);
        return entity.entity_id;
    }
    
    public remove(entityId: EntityId): void {
        this.entities.delete(entityId.id);
    }
}