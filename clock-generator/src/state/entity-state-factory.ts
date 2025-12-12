import { Belt, Entity, EntityId, ReadableEntityRegistry } from "../entities";
import { BeltState } from "./belt-state";
import { DrillState } from "./drill-state";
import { EntityState } from "./entity-state";
import { InserterState } from "./inserter-state";
import { MachineState } from "./machine-state";

export class EntityStateFactory {

    constructor(
        private readonly entityRegistry: ReadableEntityRegistry,
    ) {}

    createStateForEntity(entityId: EntityId): EntityState {

        const entity = this.entityRegistry.getEntityByIdOrThrow(entityId);

        if(Entity.isBelt(entity)) {
            return BeltState.create(entity)
        }

        if(Entity.isMachine(entity)) {
            return MachineState.forMachine(entity);
        }

        if (Entity.isInserter(entity)) {
            return InserterState.createIdle(entity);
        }

        if (Entity.isDrill(entity)) {
            return DrillState.fromEntity(entity);
        }

        throw new Error(`Cannot create state for unsupported entity type: ${entity.entity_id.type}`);
    }
}