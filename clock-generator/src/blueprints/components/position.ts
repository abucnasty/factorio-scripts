export class Position {

    public static zero: Position = new Position(0, 0)
    public static fromXY(x: number, y: number): Position {
        return new Position(x, y);
    }
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}
}