import { InserterTransfer } from "../../crafting/crafting-sequence";
import { OpenRange } from "../../data-types/open-range";
import {
    CircuitNetworkSelection,
    ComparatorString,
    DeciderCombinatorCondition,
    ControlBehavior,
    ControlBehaviorBuilder,
    DeciderCombinatorConditionBuilder,
    DeciderCombinatorOutputBuilder,
    Entity,
    EntityType,
    Position,
    SignalId,
    DeciderCombinatorOutput
} from "../components";


export interface DeciderCombinatorEntity extends Entity {
    readonly name: EntityType;
    readonly position: Position;
    readonly control_behavior: ControlBehavior;
    readonly player_description?: string;
}

export class DeciderCombinatorEntityBuilder {
    private position: Position = Position.zero;
    private control_behavior: ControlBehavior = {};
    private player_description: string | undefined = undefined;

    public setPosition(position: Position): DeciderCombinatorEntityBuilder {
        this.position = position;
        return this;
    }

    public setControlBehavior(controlBehavior: ControlBehavior): DeciderCombinatorEntityBuilder {
        this.control_behavior = controlBehavior;
        return this;
    }

    public setPlayerDescription(description: string): DeciderCombinatorEntityBuilder {
        this.player_description = description;
        return this;
    }

    public setMultiLinePlayerDescription(description: string[]): DeciderCombinatorEntityBuilder {
        this.player_description = description.join("\n");
        return this;
    }

    public build(): DeciderCombinatorEntity {
        return {
            name: EntityType.DECIDER_COMBINATOR,
            player_description: this.player_description,
            position: this.position,
            control_behavior: this.control_behavior
        };
    }
}



function clock(
    threshold: number,
    step: number = 1
): DeciderCombinatorEntityBuilder {
    const clockSignalId = SignalId.clock

    const condition = new DeciderCombinatorConditionBuilder(clockSignalId)
        .setComparator(ComparatorString.LESS_THAN)
        .setConstant(threshold - 1)
        .build()

    const outputs = [
        new DeciderCombinatorOutputBuilder(clockSignalId)
            .setCopyCountFromInput(true)
            .setConstant(step)
            .setNetworks(CircuitNetworkSelection.BOTH)
            .build(),
        new DeciderCombinatorOutputBuilder(clockSignalId)
            .setConstant(1)
            .setCopyCountFromInput(false)
            .build(),
    ]

    const controlBehavior = new ControlBehaviorBuilder()
        .setDeciderConditions([condition])
        .setOutputs(outputs)
        .build()

    return new DeciderCombinatorEntityBuilder()
        .setPosition(Position.zero)
        .setControlBehavior(controlBehavior)

}

function fromRanges(
    inputSignal: SignalId,
    inputRanges: OpenRange[],
    outputSignal: SignalId
): DeciderCombinatorEntityBuilder {

    const conditions = inputRanges.flatMap(range => DeciderCombinatorCondition.fromOpenRange(range, inputSignal));

    const output = DeciderCombinatorOutput.constant(outputSignal, 1);

    const controlBehavior = new ControlBehaviorBuilder()
        .setDeciderConditions(conditions)
        .setOutputs([output])
        .build();


    return new DeciderCombinatorEntityBuilder()
        .setPosition(Position.zero)
        .setControlBehavior(controlBehavior)
}

function fromInserterTransfers(
    clock_signal_id: SignalId,
    inserterTransfers: InserterTransfer[]
): DeciderCombinatorEntityBuilder {
    const inputRanges = inserterTransfers.flatMap(transfer => DeciderCombinatorCondition.fromInserterTransfer(transfer, clock_signal_id));

    const output = new DeciderCombinatorOutputBuilder(SignalId.each)
        .setCopyCountFromInput(false)
        .setConstant(1)
        .setNetworks(CircuitNetworkSelection.RED)
        .build();
    
    const controlBehavior = new ControlBehaviorBuilder()
        .setDeciderConditions(inputRanges)
        .setOutputs([output])
        .build();

    return new DeciderCombinatorEntityBuilder()
        .setPosition(Position.zero)
        .setControlBehavior(controlBehavior)
}


export const DeciderCombinatorEntity = {
    clock: clock,
    fromRanges: fromRanges,
    fromInserterTransfers: fromInserterTransfers,
}