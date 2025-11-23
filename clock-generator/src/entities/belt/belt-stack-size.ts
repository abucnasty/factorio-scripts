
export const BeltStackSize = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4
} as const;

export type BeltStackSize = (typeof BeltStackSize)[keyof typeof BeltStackSize];


export function isValidBeltStackSize(value: number): value is BeltStackSize {
    return Object.values(BeltStackSize).includes(value as BeltStackSize);
}
