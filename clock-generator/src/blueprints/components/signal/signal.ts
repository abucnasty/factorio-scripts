import { SignalId } from "./signal-id";
import assert from "../../../common/assert";

export interface Signal {
    readonly signal: SignalId;
    readonly index: number;
}

export class SignalBuilder {
    private signalId?: SignalId;
    private index?: number;

    constructor() {}

    public setSignalId(signalId: SignalId): SignalBuilder {
        this.signalId = signalId;
        return this;
    }

    public setIndex(index: number): SignalBuilder {
        this.index = index;
        return this;
    }
    public build(): Signal {
        assert(this.signalId, "Signal signalId is required");
        assert(this.index !== undefined, "Signal index is required");
        return {
            signal: this.signalId!,
            index: this.index!,
        };
    }
}