import { QualityIdType, SignalIdType } from "./constant";
import assert from "assert";

export interface SignalId {
    readonly name: string,
    readonly type: SignalIdType,
    readonly quality?: QualityIdType
}

export class SignalIdBuilder {
    
    private name?: string;
    private type?: SignalIdType;
    private quality?: QualityIdType;

    constructor() {}

    public setName(name: string): SignalIdBuilder {
        this.name = name;
        return this;
    }

    public setType(type: SignalIdType): SignalIdBuilder {
        this.type = type;
        return this;
    }

    public setQuality(quality: QualityIdType): SignalIdBuilder {
        this.quality = quality;
        return this;
    }

    public build(): SignalId {
        assert(this.name, "SignalId name is required");
        assert(this.type, "SignalId type is required");
        return {
            name: this.name!,
            type: this.type!,
            quality: this.quality,
        };
    }
}


export const SignalId = {
    toDescriptionString(signalId: SignalId): string {
        const entries = [
            `${signalId.type}=${signalId.name}`
        ]
        if (signalId.quality) {
            entries.push(`quality=${signalId.quality}`);
        }
        return `[${entries.join(",")}]`;
    },
    item(name: string): SignalId {
        return new SignalIdBuilder()
            .setName(name)
            .setType(SignalIdType.ITEM)
            .build();
    },
    virtual(name: string): SignalId {
        return new SignalIdBuilder()
            .setName(name)
            .setType(SignalIdType.VIRTUAL)
            .build();
    },
    clock: new SignalIdBuilder()
        .setName("signal-clock")
        .setType(SignalIdType.VIRTUAL)
        .build(),
}