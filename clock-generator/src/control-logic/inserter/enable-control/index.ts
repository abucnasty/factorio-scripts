import { Duration, OpenRange } from "../../../data-types";
import { InserterStatus } from "../../../state";
import { ControlLogic } from "../../control-logic";
import { TickProvider } from "../../current-tick-provider";
import { ClockedEnableControl, EnableControl } from "../../enable-control";
import { Resettable } from "../../resettable";

export class MaxSwingCountEnableControl implements EnableControl, Resettable {

    static create_clocked(args: {
        max_swing_count: number,
        inserter_status_provider: () => InserterStatus,
        reset_ranges: OpenRange[]
        periodDuration: Duration,
        tick_provider: TickProvider,
    }): EnableControl & Resettable & ControlLogic {
        return new ClockedResetEnableControl(
            ClockedEnableControl.create({
                periodDuration: args.periodDuration,
                enabledRanges: args.reset_ranges,
                tickProvider: args.tick_provider,
            }),
            new MaxSwingCountEnableControl(
                args.max_swing_count,
                args.inserter_status_provider,
            )
        )
    }

    constructor(
        private readonly max_swing_count: number,
        private readonly inserter_status_provider: () => InserterStatus,
    ) { }

    private last_status: InserterStatus | null = null
    private swing_count: number = 0

    public isEnabled(): boolean {
        if (this.last_status === InserterStatus.PICKUP && this.current_status === InserterStatus.SWING) {
            this.swing_count = this.swing_count + 1;
        }
        this.last_status = this.current_status;
        return this.swing_count <= this.max_swing_count;
    }

    public reset(): void {
        this.swing_count = 0;
    }

    public get current_status(): InserterStatus {
        return this.inserter_status_provider();
    }
}

export class ClockedResetEnableControl implements EnableControl, Resettable, ControlLogic {

    constructor(
        private readonly clock: ClockedEnableControl,
        private readonly enable_control: EnableControl & Resettable,
    ) { }

    public executeForTick() {
        this.isEnabled()
    }

    public isEnabled(): boolean {
        if (this.clock.isEnabled()) {
            this.reset();
        }
        return this.enable_control.isEnabled();
    }

    public reset(): void {
        if (this.enable_control) {
            this.enable_control.reset();
        }
    }
}