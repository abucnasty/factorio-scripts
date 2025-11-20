export const SignalIdType = {
    ITEM: "item",	
    FLUID: "fluid",	
    VIRTUAL: "virtual",	
    ENTITY: "entity",	
    RECIPE: "recipe",	
    SPACE_LOCATION: "space-location",	
    ASTEROID_CHUNK: "asteroid-chunk",	
    QUALITY: "quality"
} as const;

export type SignalIdType = typeof SignalIdType[keyof typeof SignalIdType];

export const QualityIdType = {
    uncommon: "uncommon",
    rare: "rare",
    epic: "epic",
    legendary: "legendary",
} as const;

export type QualityIdType = typeof QualityIdType[keyof typeof QualityIdType];

export class SignalId {

    public static clock = SignalId.virtual("signal-clock");

    public static virtual(name: string): SignalId {
        return new SignalId(name, SignalIdType.VIRTUAL);
    }

    public static item(name: string): SignalId {
        return new SignalId(name, SignalIdType.ITEM);
    }

    constructor(
        public readonly name: string,
        public readonly type: SignalIdType,
        public readonly quality: QualityIdType | undefined = undefined,
    ) {}

    public toDescriptionString(): string {
        const entries = [
            `${this.type}=${this.name}`
        ]
        if (this.quality) {
            entries.push(`quality=${this.quality}`);
        }
        return `[${entries.join(",")}]`;
    }
}

export class Signal {
    constructor(
        public readonly signal: SignalId,
        public readonly index: number
    ) {}
}