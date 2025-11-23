import { QualityIdType } from "../../../blueprints/components";
import { Duration } from "../../../data-types";
import { InserterType } from "./inserter-type";

export interface InserterSpec {
    belt: {
        pickup: Duration;
        drop: Duration;
    },
    machine: {
        pickup: Duration;
        drop: Duration;
    },
    rotation: Duration;
}

const LEGENDARY_STACK_INSERTER_SPEC: InserterSpec = {
    belt: {
        pickup: Duration.ofTicks(4),
        drop: Duration.ofTicks(4),
    },
    machine: {
        pickup: Duration.ofTicks(1),
        drop: Duration.ofTicks(1),
    },
    rotation: Duration.ofTicks(3),
};


export const INSERTER_SPECS = {
    [InserterType.STACK_INSERTER]: {
        [QualityIdType.legendary]: LEGENDARY_STACK_INSERTER_SPEC,
    }
} as const;