import { CircuitNetworkSelection } from "./constants";
import { SignalId } from "../signal";

export interface DeciderCombinatorOutput {
    /**
     * Specifies a signal to output.
     */
    readonly signal: SignalId,
    /**
     * Defaults to true. When false, will output the value from constant for the given output_signal.
     */
    readonly copy_count_from_input?: boolean | undefined;
    /**
     * The value to output when not copying input. Defaults to 1.
     */
    readonly constant?: number;
    /**
     * Sets which input network to read the value of signal from if copy_count_from_input is true. Defaults to both.
     */
    readonly networks?: CircuitNetworkSelection;
}


export class DeciderCombinatorOutputBuilder {

    private copyCountFromInput: boolean = true;
    private constant: number = 1;
    private networks: CircuitNetworkSelection | undefined = undefined;

    constructor(
        private readonly signal: SignalId,
    ) { }

    public setCopyCountFromInput(copy: boolean): DeciderCombinatorOutputBuilder {
        this.copyCountFromInput = copy;
        return this;
    }

    public setConstant(constant: number): DeciderCombinatorOutputBuilder {
        this.constant = constant;
        return this;
    }

    public setNetworks(networks: CircuitNetworkSelection): DeciderCombinatorOutputBuilder {
        this.networks = networks;
        return this;
    }

    public build(): DeciderCombinatorOutput {
        return {
            signal: this.signal,
            copy_count_from_input: this.copyCountFromInput,
            constant: this.constant,
            networks: this.networks,
        };
    }
}

function constant(signal: SignalId, constant: number): DeciderCombinatorOutput {
    return new DeciderCombinatorOutputBuilder(signal)
        .setCopyCountFromInput(false)
        .setConstant(constant)
        .build();
}

export const DeciderCombinatorOutput = {
    constant: constant,
}