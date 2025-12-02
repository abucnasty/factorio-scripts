import { Entity } from "./entity";
import { EntityId } from "./entity-id";

export interface ReadableEntityRegistry {
    hasEntity(entityId: EntityId): boolean;
    getEntityById(entityId: EntityId): Entity | null;
    getEntityByIdOrThrow<T extends Entity>(entityId: EntityId): T;
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

    public getEntityById<T extends Entity>(entityId: EntityId): T | null {
        return this.entities.get(entityId.id) as T ?? null;
    }

    public getEntityByIdOrThrow<T extends Entity>(entityId: EntityId): T {
        const entity = this.getEntityById(entityId);
        if (!entity) {
            throw new Error(`Entity with ID ${entityId.id} does not exist`);
        }
        return entity as T;
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