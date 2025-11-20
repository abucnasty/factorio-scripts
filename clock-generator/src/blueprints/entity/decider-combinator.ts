import { OpenRange } from "../../data-types/range";
import {
    ComparatorString,
    ControlBehavior,
    DeciderCombinatorCondition,
    DeciderCombinatorOutput,
    DeciderConditions,
    Entity,
    EntityType,
    Position,
    SignalId
} from "../components";

export class DeciderCombinatorEntity implements Entity {


    public static clock(
        threshold: number,
        step: number = 1
    ): DeciderCombinatorEntity {

        const clockSignalId = SignalId.clock

        const condition = new DeciderCombinatorCondition(clockSignalId)
        condition.comparator = ComparatorString.LESS_THAN
        condition.constant = threshold - 1

        const outputs = [
            new DeciderCombinatorOutput(
                clockSignalId,
                true,
                step
            ),
            DeciderCombinatorOutput.constant(clockSignalId, 1),
        ]

        const controlBehavior = new ControlBehavior(new DeciderConditions([condition], outputs))

        return new DeciderCombinatorEntity(
            Position.zero,
            controlBehavior
        )

    }

    public static fromRanges(
        inputSignal: SignalId,
        inputRanges: OpenRange[],
        outputSignal: SignalId
    ): DeciderCombinatorEntity {

        const conditions = inputRanges.flatMap(range => DeciderCombinatorCondition.fromOpenRange(range, inputSignal));

        const output = DeciderCombinatorOutput.constant(outputSignal, 1);

        const controlBehavior = new ControlBehavior(new DeciderConditions(conditions, [output]))

        return new DeciderCombinatorEntity(
            Position.zero,
            controlBehavior
        )
    }

    public readonly name: EntityType = EntityType.DECIDER_COMBINATOR;

    constructor(
        public position: Position,
        public control_behavior: ControlBehavior,
        public player_description: string | undefined = undefined,
    ) { }
}