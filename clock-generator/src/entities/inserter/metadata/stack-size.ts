export const InserterStackSize = {
    SIZE_01: 1,
    SIZE_02: 2,
    SIZE_03: 3,
    SIZE_04: 4,
    SIZE_05: 5,
    SIZE_06: 6,
    SIZE_07: 7,
    SIZE_08: 8,
    SIZE_09: 9,
    SIZE_10: 10,
    SIZE_11: 11,
    SIZE_12: 12,
    SIZE_13: 13,
    SIZE_14: 14,
    SIZE_15: 15,
    SIZE_16: 16,
} as const;

export type InserterStackSize = typeof InserterStackSize[keyof typeof InserterStackSize];