import { ControlBehavior } from "./control-behavior";
import { Position } from "./position";

// only supported entity types, not all entities in the game
export const EntityType = {
    DECIDER_COMBINATOR: "decider-combinator",
    ARITHMETIC_COMBINATOR: "arithmetic-combinator",
    CONSTANT_COMBINATOR: "constant-combinator",
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

export interface Entity {
    name: EntityType;
    position: Position;
    control_behavior?: ControlBehavior;
    player_description?: string;
}

export interface EntityWithId extends Entity {
    entity_number: number;
}