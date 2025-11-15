import { OpenRange } from "../data-types/range";

const STACK_INSERTER_Q5 = {
    FROM_BELT_PICKUP: 4,
    TO_BELT_DROP: 4,
    FROM_MACHINE_PICKUP: 1,
    TO_MACHINE_DROP: 1,
    SWING_ANIMATION: 3,
}

export type InserterSource = "belt" | "machine"
export type InserterSink = "belt" | "machine"

export class Inserter {
    constructor(
        public readonly stack_size: number,
        public readonly pickup_ticks: OpenRange,
        public readonly drop_ticks: OpenRange,
        public readonly total_ticks: OpenRange,
        public readonly source: InserterSource,
        public readonly target: InserterSink,
    ) { }
}

export class InserterFactory {

    public static fromMachineToBelt(
        stackSize: number
    ) {
        const pickupTick = STACK_INSERTER_Q5.FROM_MACHINE_PICKUP;
        const pickupTicks = OpenRange.from(
            1,
            pickupTick
        );
        const dropTicks = OpenRange.from(
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + 1,
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + 1 + STACK_INSERTER_Q5.TO_BELT_DROP
        )

        const totalTicks = OpenRange.from(
            pickupTicks.start_inclusive,
            dropTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION
        );
        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, "machine", "belt");
    }

    public static fromMachineToMachine(
        stackSize: number
    ) {
        const pickupTick = STACK_INSERTER_Q5.FROM_MACHINE_PICKUP;
        const pickupTicks = OpenRange.from(
            1,
            pickupTick
        );
        const dropTicks = OpenRange.from(
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + STACK_INSERTER_Q5.TO_MACHINE_DROP,
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + STACK_INSERTER_Q5.TO_MACHINE_DROP
        )
        const totalTicks = OpenRange.from(
            pickupTicks.start_inclusive,
            dropTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION
        );
        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, "machine", "machine");
    }

    public static fromBeltToMachine(
        stackSize: number
    ) {
        const pickupTick = STACK_INSERTER_Q5.FROM_BELT_PICKUP;
        const pickupTicks = OpenRange.from(
            1,
            pickupTick + 1
        );
        const dropTicks = OpenRange.from(
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + STACK_INSERTER_Q5.TO_MACHINE_DROP,
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION+STACK_INSERTER_Q5.TO_MACHINE_DROP
        )

        const totalTicks = OpenRange.from(
            pickupTicks.start_inclusive,
            dropTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION
        );

        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, "belt", "machine");
    }
}