import { ItemName } from "../data/factorio-data-types";

export const BeltStackSize = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4
} as const;

export type BeltStackSize = typeof BeltStackSize[keyof typeof BeltStackSize];

export interface Lane {
    ingredient_name: ItemName;
    stack_size: BeltStackSize;
}

export interface Belt {
    readonly lanes: readonly Lane[]
    readonly items_per_second: number
}


export const BeltSpeed = {
    TRANSPORT_BELT: 15,
    FAST_TRANSPORT_BELT: 30,
    EXPRESS_TRANSPORT_BELT: 45,
    TURBO_TRANSPORT_BELT: 60
} as const;

export type BeltSpeed = typeof BeltSpeed[keyof typeof BeltSpeed];


export class BeltBuilder {
    private lanes: Lane[] = [];

    constructor(private readonly items_per_second: number) {}

    addLane(ingredient_name: ItemName, stack_size: BeltStackSize): BeltBuilder {
        this.lanes.push({ ingredient_name, stack_size });
        return this;
    }

    build(): Belt {
        return {
            lanes: this.lanes,
            items_per_second: this.items_per_second
        };
    }
}