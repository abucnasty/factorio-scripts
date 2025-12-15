import {
    SECONDS_PER_TICK,
    TICKS_PER_SECOND
} from "./constants"

export interface Duration {
    ticks: number;
    seconds: number;
}


function ofTicks(ticks: number): Duration {
    return {
        ticks,
        seconds: SECONDS_PER_TICK.multiply(ticks).toDecimal()
    };
}

function ofSeconds(seconds: number): Duration {
    return {
        ticks: TICKS_PER_SECOND.multiply(seconds).toDecimal(),
        seconds: seconds
    };
}


export const Duration = {
    ofTicks: ofTicks,
    ofSeconds: ofSeconds,
    zero: ofTicks(0),
}