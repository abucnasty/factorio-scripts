import { Chest, Entity, EntityId, ReadableEntityRegistry } from "../entities";
import { BeltState } from "./belt-state";
import { BufferChestState } from "./buffer-chest-state";
import { DrillState } from "./drill-state";
import { EntityState } from "./entity-state";
import { InfinityChestState } from "./infinity-chest-state";
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

        if (Entity.isChest(entity)) {
            if (Chest.isInfinityChest(entity)) {
                return InfinityChestState.forChest(entity);
            }
            if (Chest.isBufferChest(entity)) {
                return BufferChestState.forChest(entity);
            }
            throw new Error(`Unsupported chest type: ${entity.chest_type}`);
        }

        throw new Error(`Cannot create state for unsupported entity type: ${entity.entity_id.type}`);
    }
}