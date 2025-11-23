export const InserterType = {
    STACK_INSERTER: "stack-inserter",
} as const;

export type InserterType = typeof InserterType[keyof typeof InserterType];