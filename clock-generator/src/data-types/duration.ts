import {
    SECONDS_PER_TICK,
    TICKS_PER_SECOND
} from "./constants"

export class Duration {

    public static ofTicks = ofTicks
    public static ofSeconds = ofSeconds
    public static zero = ofTicks(0)

    constructor(
        public readonly ticks: number,
        public readonly seconds: number
    ) {}

    public add(other: Duration): Duration {
        return Duration.ofTicks(this.ticks + other.ticks);
    }

    public subtract(other: Duration): Duration {
        return Duration.ofTicks(this.ticks - other.ticks);
    }
}


function ofTicks(ticks: number): Duration {
    return new Duration(
        ticks,
        SECONDS_PER_TICK.multiply(ticks).toDecimal()
    );
}

function ofSeconds(seconds: number): Duration {
    return new Duration(
        TICKS_PER_SECOND.multiply(seconds).toDecimal(),
        seconds
    );
}