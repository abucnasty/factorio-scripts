import assert from "assert"
import { Belt } from "./belt";
import { EntityId } from "./entity-id";
import { Inserter } from "./inserter";
import { Machine } from "./machine";

export interface Entity {
    readonly entity_id: EntityId
}

function isInserter(entity: Entity): entity is Inserter {
    return EntityId.isInserter(entity.entity_id);
}

function isMachine(entity: Entity): entity is Machine {
    return EntityId.isMachine(entity.entity_id);
}

function isBelt(entity: Entity): entity is Belt {
    return EntityId.isBelt(entity.entity_id);
}

export function assertIsInserter(entity: Entity): asserts entity is Inserter {
    assert(isInserter(entity), `Entity with id ${entity.entity_id} is not an inserter`);
}

export function assertIsMachine(entity: Entity): asserts entity is Machine {
    assert(isMachine(entity), `Entity with id ${entity.entity_id} is not a machine`);
}

export function assertIsBelt(entity: Entity): asserts entity is Belt {
    assert(isBelt(entity), `Entity with id ${entity.entity_id} is not a belt`);
}

export const Entity = {
    isInserter: isInserter,
    isMachine: isMachine,
    isBelt: isBelt,
};