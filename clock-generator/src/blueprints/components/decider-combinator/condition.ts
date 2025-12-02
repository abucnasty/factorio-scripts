import { OpenRange } from "../../../data-types/open-range";
import { SignalId } from "../signal";
import { ComparatorString, CompareType, CircuitNetworkSelection } from "./constants";

export interface DeciderCombinatorCondition {
    readonly first_signal: SignalId;
    /**
     * Specifies how the inputs should be compared. If not specified, defaults to "<".
     */
    readonly comparator: ComparatorString;
    /**
     * Tells how this condition is compared with the preceding conditions in the corresponding conditions array. Defaults to "or".
     */
    readonly compare_type?: CompareType;
    /**
     * Constant to compare first_signal to. 
     * Has no effect when second_signal is set. 
     * When neither second_signal nor constant are specified, the effect is as though constant were specified with the value 0.
     */
    readonly constant?: number;
    /**
     * What to compare [first_signal] to. If not specified, first_signal will be compared to constant.
     */
    readonly second_signal?: SignalId;
    /**
     * Which circuit networks (red/green) to read first_signal from. Defaults to both.
     */
    readonly first_signal_networks?: CircuitNetworkSelection;
}

export class DeciderCombinatorConditionBuilder {

    private compareType: CompareType | undefined = undefined;
    private constant: number | undefined = undefined;
    private secondSignal: SignalId | undefined = undefined;
    private firstSignalNetworks: CircuitNetworkSelection | undefined = undefined;
    private comparator: ComparatorString = ComparatorString.LESS_THAN;

    constructor(
        private readonly firstSignal: SignalId,
    ) { }

    public setComparator(comparator: ComparatorString): DeciderCombinatorConditionBuilder {
        this.comparator = comparator;
        return this;
    }

    public setCompareType(compareType: CompareType): DeciderCombinatorConditionBuilder {
        this.compareType = compareType;
        return this;
    }

    public setConstant(constant: number): DeciderCombinatorConditionBuilder {
        this.constant = constant;
        return this;
    }

    public setSecondSignal(secondSignal: SignalId): DeciderCombinatorConditionBuilder {
        this.secondSignal = secondSignal;
        return this;
    }

    public setFirstSignalNetworks(networks: CircuitNetworkSelection): DeciderCombinatorConditionBuilder {
        this.firstSignalNetworks = networks;
        return this;
    }

    public build(): DeciderCombinatorCondition {
        return {
            first_signal: this.firstSignal,
            comparator: this.comparator,
            compare_type: this.compareType,
            constant: this.constant,
            second_signal: this.secondSignal,
            first_signal_networks: this.firstSignalNetworks
        };
    }
}

function fromOpenRange(openRange: OpenRange, signalId: SignalId): DeciderCombinatorCondition[] {
    const start = new DeciderCombinatorConditionBuilder(signalId)
        .setComparator(ComparatorString.GREATER_THAN_OR_EQUAL_TO)
        .setConstant(openRange.start_inclusive)
        .build();

    const end = new DeciderCombinatorConditionBuilder(signalId)
        .setComparator(ComparatorString.LESS_THAN_OR_EQUAL_TO)
        .setConstant(openRange.end_inclusive)
        .setCompareType(CompareType.AND)
        .build();

    return [start, end]
}

export const DeciderCombinatorCondition = {
    fromOpenRange: fromOpenRange,
}