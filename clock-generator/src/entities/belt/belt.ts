import { BeltConfig } from "../../config";
import { ItemName } from "../../data";
import assert from "../../common/assert";
import { BeltStackSize, isValidBeltStackSize } from "./belt-stack-size";
import { EntityId } from "../entity-id";
import { Entity } from "../entity";
import { Duration } from "../../data-types";

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

export const BeltTileMovementDuration: Record<BeltSpeed, Duration> = {
    [BeltSpeed.TRANSPORT_BELT]: Duration.ofSeconds(1.875),
    [BeltSpeed.FAST_TRANSPORT_BELT]: Duration.ofSeconds(3.75),
    [BeltSpeed.EXPRESS_TRANSPORT_BELT]: Duration.ofSeconds(5.625),
    [BeltSpeed.TURBO_TRANSPORT_BELT]: Duration.ofSeconds(7.5),
};

/**
 * the drop rate of a turbo belt with stack size 1 for a turbo belt will be a sequence that looks as follows:
 * 1. drop 1 item
 * 2. drop 1 item
 * 3. drop 1 item
 * 4. nothing (wait until tile is free)
 * 5. drop 1 item
 * 6. nothing (wait until tile is free)
 * 7. drop 1 item
 * ...
 * 
 * for a turbo belt with stack size 4, the drop rate will be:
 * 1. drop 4 items
 * 2. drop 4 items
 * 3. drop 4 items
 * 4. nothing (wait until tile is free)
 * 5. drop 4 items
 * 6. nothing (wait until tile is free)
 * 7. drop 4 items
 * ...
 * 
 * for an fast transport belt with stack size 1, the drop rate will be:
 * 1. drop 1 item
 * 2. drop 1 item
 * 3. nothing (wait until tile is free)
 * 4. nothing (wait until tile is free)
 * 5. drop 1 item
 * 6. nothing (wait until tile is free)
 * 7. nothing (wait until tile is free)
 * 8. nothing (wait until tile is free)
 * 9. drop 1 item
 * 10. nothing (wait until tile is free)
 * 11. nothing (wait until tile is free)
 * 12. nothing (wait until tile is free)
 * 13. drop 1 item
 * ...
 * 
 * This is due to the underlying throttle rate at which items can move forward on the belt.
 * 
 * A belt tile is made of a segment that holds 4 items. So in the above cases, the stack size determines how much can be dropped
 * each tick, but the belt speed determines how often items can be dropped.
 * 
 * The inserter drops items at the 1st index of 4 items on the belt (base 0). Each tick, that item moves forward
 * at a rate determined by the belt speed, so 0.125 tiles per tick for a turbo belt.
 * 
 * Since an inserter drops at index 1, that means at maximum a single inserter can only occupy 3 of the 4 item slots in the belt
 * at a time. This acts like a shift register where the inserter can drop items into the belt at indices 0, 1, and 2,
 * but must wait for index 3 to clear before it can drop more items.
 * 
 * Therefore, the effective drop rate is determined by how many items can be dropped per tick (stack size)
 * and how often the inserter can drop items (belt speed).
 */
function amountToDropAtTick(belt_speed: BeltSpeed, stackSize: BeltStackSize, tick_index: number): number {
    const movement_duration = BeltTileMovementDuration[belt_speed];
    return 0
}


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
    fromConfig: fromConfig,
    amountToDropAtTick: amountToDropAtTick,
}