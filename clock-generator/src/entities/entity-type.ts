export const EntityType = {
    BELT: "belt",
    MACHINE: "machine",
    INSERTER: "inserter",
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];