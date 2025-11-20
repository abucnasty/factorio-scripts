import { OpenRange } from "../../data-types/range";
import { CircuitNetworkSelection } from "./circuits";
import { SignalId } from "./signal";

export const ComparatorString = {
    EQUAL_TO: "=",
    GREATER_THAN: ">",
    LESS_THAN: "<",
    GREATER_THAN_OR_EQUAL_TO: "≥",
    GREATER_THAN_OR_EQUAL_TO_ALT: ">=",
    LESS_THAN_OR_EQUAL_TO: "≤",
    LESS_THAN_OR_EQUAL_TO_ALT: "<=",
    NOT_EQUAL_TO: "≠",
    NOT_EQUAL_TO_ALT: "!=",
} as const;

export const CompareType = {
    AND: "and",
    OR: "or",
} as const;
export type CompareType = typeof CompareType[keyof typeof CompareType];

export type ComparatorString = typeof ComparatorString[keyof typeof ComparatorString];

export class DeciderCombinatorCondition {

    static fromOpenRange(openRange: OpenRange, signalId: SignalId): DeciderCombinatorCondition[] {
        const start  = new DeciderCombinatorCondition(signalId)
        start.comparator = ComparatorString.GREATER_THAN_OR_EQUAL_TO;
        start.constant = openRange.start_inclusive;

        const end  = new DeciderCombinatorCondition(signalId)
        end.comparator = ComparatorString.LESS_THAN_OR_EQUAL_TO;
        end.constant = openRange.end_inclusive;
        end.compare_type = CompareType.AND;
        
        return [start, end]
    }

    constructor(
        public first_signal: SignalId,
        /**
         * Specifies how the inputs should be compared. If not specified, defaults to "<".
         */
        public comparator: ComparatorString = ComparatorString.LESS_THAN,
        /**
         * Tells how this condition is compared with the preceding conditions in the corresponding conditions array. Defaults to "or".
         */
        public compare_type: CompareType | undefined = undefined,
        /**
         * Constant to compare first_signal to. 
         * Has no effect when second_signal is set. 
         * When neither second_signal nor constant are specified, the effect is as though constant were specified with the value 0.
         */
        public constant: number | undefined = undefined,
        /**
         * What to compare [first_signal] to. If not specified, first_signal will be compared to constant.
         */
        public second_signal: SignalId | undefined = undefined,
        /**
         * Which circuit networks (red/green) to read first_signal from. Defaults to both.
         */
        public first_signal_networks: CircuitNetworkSelection | undefined = undefined,
    ) {}
}

export class DeciderCombinatorOutput {

    static constant(signal: SignalId, constant: number): DeciderCombinatorOutput {
        return new DeciderCombinatorOutput(signal, false, constant);
    }

    constructor(
        /**
         * Specifies a signal to output.
         */
        public signal: SignalId,
        /**
         * Defaults to true. When false, will output the value from constant for the given output_signal.
         */
        public copy_count_from_input: boolean | undefined = undefined,
        /**
         * The value to output when not copying input. Defaults to 1.
         */
        public constant: number | undefined = 1,
        /**
         * Sets which input network to read the value of signal from if copy_count_from_input is true. Defaults to both.
         */
        public networks: CircuitNetworkSelection | undefined = undefined,
    ) {}
}

export class DeciderConditions {
    constructor(
        public conditions: DeciderCombinatorCondition[],
        public outputs: DeciderCombinatorOutput[],
    ) {}
}

export class ControlBehavior {
    constructor(
        public readonly decider_conditions: DeciderConditions | undefined = undefined,
    ) {}
}