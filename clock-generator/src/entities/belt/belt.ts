import { BeltConfig } from "../../config";
import { ItemName } from "../../data";
import assert from "assert";
import { BeltStackSize, isValidBeltStackSize } from "./belt-stack-size";
import { EntityId } from "../entity-id";
import { Entity } from "../entity";

export interface Lane {
    ingredient_name: ItemName;
    stack_size: BeltStackSize;
}

export interface Belt extends Entity{
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
    private id?: EntityId;

    constructor() { }

    setId(id: number): BeltBuilder {
        this.id = EntityId.forBelt(id);
        return this;
    }

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
        assert(this.lanes.length > 0, "At least one lane must be added before building a Belt");
        assert(this.id !== undefined, "Belt id must be set before building a Belt");
        return {
            entity_id: this.id!,
            lanes: this.lanes,
            belt_speed: this.belt_speed!
        };
    }
}

function fromConfig(config: BeltConfig): Belt {
    const builder = new BeltBuilder().setId(config.id)

    switch(config.type) {
        case "express-transport-belt":
            builder.setBeltSpeed(BeltSpeed.EXPRESS_TRANSPORT_BELT);
            break;
        case "fast-transport-belt":
            builder.setBeltSpeed(BeltSpeed.FAST_TRANSPORT_BELT);
            break;
        case "turbo-transport-belt":
            builder.setBeltSpeed(BeltSpeed.TURBO_TRANSPORT_BELT);
            break;
        case "transport-belt":
            builder.setBeltSpeed(BeltSpeed.TRANSPORT_BELT);
            break;
    }

    for (const lane of config.lanes) {
        assert(isValidBeltStackSize(lane.stack_size), `Invalid stack size: ${lane.stack_size}`);
        builder.addLane(lane.ingredient, lane.stack_size as BeltStackSize);
    }
    return builder.build();
}

function createSingleLaneBelt(beltSpeed: BeltSpeed, ingredient: ItemName, stackSize: BeltStackSize): BeltBuilder {
    return new BeltBuilder()
        .setBeltSpeed(beltSpeed)
        .addLane(ingredient, stackSize)
}

function createDoubleLaneBelt(beltSpeed: BeltSpeed, ingredient: ItemName, stackSize: BeltStackSize): BeltBuilder {
    const builder = new BeltBuilder().setBeltSpeed(beltSpeed);
    builder.addLane(ingredient, stackSize);
    builder.addLane(ingredient, stackSize);
    return builder
}

function createSplitLaneBelt(beltSpeed: BeltSpeed, ingredientA: ItemName, ingredientB: ItemName, stackSize: BeltStackSize): BeltBuilder {
    const builder = new BeltBuilder().setBeltSpeed(beltSpeed);
    builder.addLane(ingredientA, stackSize);
    builder.addLane(ingredientB, stackSize);
    return builder
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
    fromConfig: fromConfig
}