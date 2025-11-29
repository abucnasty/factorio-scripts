import { Belt, Entity, EntityId, EntityType, Inserter, Machine, ReadableEntityRegistry } from "../entities";
import { BeltInventoryState } from "./belt-inventory-state";
import { EntityState } from "./entity-state";
import { InserterState } from "./inserter-state";
import { MachineState } from "./machine-state";

export class EntityStateFactory {

    constructor(
        private readonly entityRegistry: ReadableEntityRegistry,
    ) {}

    createStateForEntity(entityId: EntityId): EntityState {

        const entity = this.entityRegistry.getEntityByIdOrThrow(entityId);

        if(entity.entity_id.type === EntityType.BELT) {
            return {
                entity_id: entity.entity_id,
                inventoryState: BeltInventoryState.fromBelt(entity as Belt),
            }
        }

        if(entity.entity_id.type === EntityType.MACHINE) {
            return MachineState.forMachine(entity as Machine);
        }

        if (entity.entity_id.type === EntityType.INSERTER) {
            return InserterState.createIdle(entity as Inserter);
        }

        throw new Error(`Cannot create state for unsupported entity type: ${entity.entity_id.type}`);
    }
}