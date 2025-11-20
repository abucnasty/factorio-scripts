import { Entity, EntityWithId } from "../components";

export function entityWithId(entity: Entity, id: number): EntityWithId {

    const propertiesOnly = JSON.stringify(entity);
    const reparsedEntity: Entity = JSON.parse(propertiesOnly);

    return {
        ...reparsedEntity,
        entity_number: id,
    }
}