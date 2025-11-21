export const ComparatorString = {
    EQUAL_TO: "=",
    GREATER_THAN: ">",
    LESS_THAN: "<",
    GREATER_THAN_OR_EQUAL_TO: "≥",
    GREATER_THAN_OR_EQUAL_TO_ALT: ">=",
    LESS_THAN_OR_EQUAL_TO: "≤",
    LESS_THAN_OR_EQUAL_TO_ALT: "<=",
    NOT_EQUAL_TO: "≠",
    NOT_EQUAL_TO_ALT: "!=",
} as const;

export type ComparatorString = typeof ComparatorString[keyof typeof ComparatorString];

export const CompareType = {
    AND: "and",
    OR: "or",
} as const;

export type CompareType = typeof CompareType[keyof typeof CompareType];


export interface CircuitNetworkSelection {
    readonly red?: boolean;
    readonly green?: boolean;
}

export const CircuitNetworkSelection = {
    BOTH: { red: true, green: true } as CircuitNetworkSelection,
}