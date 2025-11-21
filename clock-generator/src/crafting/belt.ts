import { ItemName } from "../data/factorio-data-types";
import assert from "assert";

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
    readonly belt_speed: BeltSpeed
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
    private belt_speed?: BeltSpeed;

    constructor() { }

    addLane(ingredient_name: ItemName, stack_size: BeltStackSize): BeltBuilder {
        this.lanes.push({ ingredient_name, stack_size });
        return this;
    }

    setBeltSpeed(belt_speed: BeltSpeed): BeltBuilder {
        this.belt_speed = belt_speed;
        return this;
    }

    build(): Belt {
        assert(this.belt_speed !== undefined, "Belt speed must be set before building a Belt");
        return {
            lanes: this.lanes,
            belt_speed: this.belt_speed!
        };
    }
}

function createSingleLaneBelt(beltSpeed: BeltSpeed, ingredient: ItemName, stackSize: BeltStackSize): Belt {
    return new BeltBuilder()
        .setBeltSpeed(beltSpeed)
        .addLane(ingredient, stackSize)
        .build();
}

function createDoubleLaneBelt(beltSpeed: BeltSpeed, ingredient: ItemName, stackSize: BeltStackSize): Belt {
    const builder = new BeltBuilder().setBeltSpeed(beltSpeed);
    builder.addLane(ingredient, stackSize);
    builder.addLane(ingredient, stackSize);
    return builder.build();
}

function createSplitLaneBelt(beltSpeed: BeltSpeed, ingredientA: ItemName, ingredientB: ItemName, stackSize: BeltStackSize): Belt {
    const builder = new BeltBuilder().setBeltSpeed(beltSpeed);
    builder.addLane(ingredientA, stackSize);
    builder.addLane(ingredientB, stackSize);
    return builder.build();
}

export const buildersForBeltSpeed = (beltSpeed: BeltSpeed) => ({
    createSingleLaneBelt: (
        ingredient: ItemName,
        stackSize: BeltStackSize = BeltStackSize.FOUR,
    ) => createSingleLaneBelt(beltSpeed, ingredient, stackSize),
    createDoubleLaneBelt: (
        ingredient: ItemName,
        stackSize: BeltStackSize = BeltStackSize.FOUR,
    ) => createDoubleLaneBelt(beltSpeed, ingredient, stackSize),
    createSplitLaneBelt: (
        ingredientA: ItemName,
        ingredientB: ItemName,
        stackSize: BeltStackSize = BeltStackSize.FOUR,
    ) => createSplitLaneBelt(beltSpeed, ingredientA, ingredientB, stackSize),
});


export const Belt = {
    turbo_transport_belt: buildersForBeltSpeed(BeltSpeed.TURBO_TRANSPORT_BELT),
    express_transport_belt: buildersForBeltSpeed(BeltSpeed.EXPRESS_TRANSPORT_BELT),
    fast_transport_belt: buildersForBeltSpeed(BeltSpeed.FAST_TRANSPORT_BELT),
    transport_belt: buildersForBeltSpeed(BeltSpeed.TRANSPORT_BELT),
}