import { SignalId } from "./signal";

export class Icon {
    constructor(
        public readonly signal: SignalId,
        public readonly index: number
    ) {}
}