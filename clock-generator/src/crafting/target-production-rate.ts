export class TargetProductionRate {
    constructor(
        public readonly recipe: string,
        public readonly items_per_second: number,
        public readonly machines: number,
    ) {}
}