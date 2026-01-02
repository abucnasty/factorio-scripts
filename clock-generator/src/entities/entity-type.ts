export const EntityType = {
    BELT: "belt",
    MACHINE: "machine",
    INSERTER: "inserter",
    DRILL: "drill",
    CHEST: "chest",
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];