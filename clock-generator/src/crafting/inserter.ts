import { InserterConfiguration } from "../config/config";
import { OpenRange } from "../data-types/range";
import { ReadableMachineRegistry } from "./machine-registry";

const STACK_INSERTER_Q5 = {
    FROM_BELT_PICKUP: 4,
    TO_BELT_DROP: 4,
    FROM_MACHINE_PICKUP: 1,
    TO_MACHINE_DROP: 1,
    SWING_ANIMATION: 3,
}

export type InteractionType = "belt" | "machine";

export interface InteractionPoint {
    type: InteractionType;
    machine_id?: number;
    ingredient_name?: string;
}
export class MachineInteractionPoint implements InteractionPoint {
    constructor(
        public readonly machine_id: number,
        public readonly type: "machine" = "machine"
    ) { }
}

export class BeltInteractionPoint implements InteractionPoint {
    public readonly type: "belt" = "belt";
    constructor(
        public readonly ingredient_name: string
    ) {}
}

export class Inserter {
    constructor(
        public readonly stack_size: number,
        /**
         * duration of ticks to enable as a range to pickup items
         */
        public readonly pickup_ticks: OpenRange,
        /**
         * duration of ticks to enable as a range to drop items
         */
        public readonly drop_ticks: OpenRange,
        /**
         * total duration of ticks for the inserter cycle
         */
        public readonly total_ticks: OpenRange,
        public readonly source: InteractionPoint,
        public readonly target: InteractionPoint,
        public readonly ingredient_name: string,
        public id: number = -1,
    ) { }

    public swingDuration() {
        return this.total_ticks.duration();
    }

    public setId(id: number) {
        this.id = id;
    }

    public prettyPrint() {
        return `Inserter ${this.id}: [${this.source.type}${this.source.type === "machine" ? `:${this.source.machine_id}` : `:${this.ingredient_name}` } -> ${this.target.type}${this.target.type === "machine" ? `:${this.target.machine_id}` : `:${this.ingredient_name}` }]`;
    }
}

export class InserterFactory {

    constructor(
        private readonly machineRegistry: ReadableMachineRegistry
    ) {}

    public fromConfig(config: InserterConfiguration): Inserter {
        if (config.source.type === "belt" && config.target.type === "belt") {
            throw new Error(`Inserter cannot have both source and target as belt.`);
        }
        if (config.source.type === "machine" && config.target.type === "machine") {
            return this.fromMachineToMachine(
                config.source.machine_id,
                config.target.machine_id,
                config.stack_size
            );
        }

        if (config.source.type === "machine" && config.target.type === "belt") {
            return this.fromMachineToBelt(
                config.source.machine_id,
                config.target.ingredient,
                config.stack_size
            );
        }

        if (config.source.type === "belt" && config.target.type === "machine") {
            return this.fromBeltToMachine(
                config.source.ingredient,
                config.target.machine_id,
                config.stack_size
            );
        }

        throw new Error(`Unhandled inserter configuration: ${JSON.stringify(config)}`);
    }

    public fromMachineToBelt(
        source_machine_id: number,
        target_ingredient_name: string,
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
            dropTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + 1
        );

        const ingredient_name = this.machineRegistry.getMachineByIdOrThrow(source_machine_id).output.ingredient.name;

        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, new MachineInteractionPoint(source_machine_id), new BeltInteractionPoint(target_ingredient_name), ingredient_name);
    }

    public fromMachineToMachine(
        source_machine_id: number,
        target_machine_id: number,
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

        const ingredient_name = this.machineRegistry.getMachineByIdOrThrow(source_machine_id).output.ingredient.name;

        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, new MachineInteractionPoint(source_machine_id), new MachineInteractionPoint(target_machine_id), ingredient_name);
    }

    public fromBeltToMachine(
        source_ingredient_name: string,
        target_machine_id: number,
        stackSize: number
    ) {
        const pickupTick = STACK_INSERTER_Q5.FROM_BELT_PICKUP;
        const pickupTicks = OpenRange.from(
            1,
            pickupTick + 1
        );
        const dropTicks = OpenRange.from(
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + STACK_INSERTER_Q5.TO_MACHINE_DROP,
            pickupTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION + STACK_INSERTER_Q5.TO_MACHINE_DROP
        )

        const totalTicks = OpenRange.from(
            pickupTicks.start_inclusive,
            dropTicks.end_inclusive + STACK_INSERTER_Q5.SWING_ANIMATION
        );



        return new Inserter(stackSize, pickupTicks, dropTicks, totalTicks, new BeltInteractionPoint(source_ingredient_name), new MachineInteractionPoint(target_machine_id), source_ingredient_name);
    }
}