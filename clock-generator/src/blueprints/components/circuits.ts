export class CircuitNetworkSelection {
    public static BOTH = new CircuitNetworkSelection(true, true);
    constructor(
        public readonly red: boolean | undefined = undefined,
        public readonly green: boolean | undefined = undefined,
    ) {}
}