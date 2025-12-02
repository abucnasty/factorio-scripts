import { Duration, OpenRange } from "../data-types";
import { TickProvider } from "./current-tick-provider";

export interface EnableControl {
    isEnabled(): boolean;
}

export const AlwaysEnabledControl: EnableControl = {
    isEnabled(): boolean {
        return true;
    }
};

export class EnableControlLambda implements EnableControl {
    constructor(
        private readonly enabledFn: () => boolean
    ) { }

    public isEnabled(): boolean {
        return this.enabledFn();
    }
}

export class PeriodicEnableControl implements EnableControl {
    constructor(
        public readonly periodDuration: Duration,
        public readonly enabledRanges: ReadonlyArray<OpenRange>,
        public readonly tickProvider: TickProvider
    ) { }

    public isEnabled(): boolean {
        const currentTick = this.tickProvider.getCurrentTick()
        const adjustedTick = currentTick % this.periodDuration.ticks;
        return this.enabledRanges.some(range => range.contains(adjustedTick));
    }
}

export class LatchedEnableControl implements EnableControl {
    private latchStartTick: number | null = null;

    constructor(
        private readonly enableControl: EnableControl,
        private readonly latchDuration: Duration,
        private readonly tickProvider: TickProvider
    ) { }

    public isEnabled(): boolean {
        const currentlyEnabled = this.enableControl.isEnabled();
        const currentTick = this.tickProvider.getCurrentTick();

        if (currentlyEnabled) {
            this.latchStartTick = currentTick;
            return true;
        }

        if (this.latchStartTick !== null) {
            const ticksSinceLatch = currentTick - this.latchStartTick;
            if (ticksSinceLatch < this.latchDuration.ticks) {
                return true;
            } else {
                this.reset();
            }
        }

        return false;
    }

    public reset(): void {
        this.latchStartTick = null;
    }
}

/**
 * Creates an EnableControl that enables for a specified duration within a repeating period, with an optional offset.
 */
export function createPeriodicEnableControl(args: {
    /**
     * The total period in ticks for the enable/disable cycle.
     */
    periodDuration: Duration,
    /**
     * The duration in ticks for which the control is enabled within each period.
     */
    enabledRanges: ReadonlyArray<OpenRange>,
    tickProvider: TickProvider
}): PeriodicEnableControl {
    const { periodDuration, enabledRanges, tickProvider } = args;

    return new PeriodicEnableControl(
        periodDuration,
        enabledRanges,
        tickProvider
    );
}

export function createLatchedEnableControl(args: {
    enableControl: EnableControl,
    latchDuration: Duration,
    tickProvider: TickProvider
}): EnableControl {
    const { enableControl, latchDuration, tickProvider } = args;
    return new LatchedEnableControl(
        enableControl,
        latchDuration,
        tickProvider
    )
}

export function createLambdaEnableControl(args: {
    enabledFn: () => boolean
}): EnableControl {
    const { enabledFn } = args;
    return new EnableControlLambda(enabledFn);
}

export const EnableControl = {
    latched: createLatchedEnableControl,
    lambda: createLambdaEnableControl,
    periodic: createPeriodicEnableControl
}