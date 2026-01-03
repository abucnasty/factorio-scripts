import { Duration, OpenRange } from "../../../data-types";
import { InserterStatus } from "../../../state";
import { ControlLogic } from "../../control-logic";
import { TickProvider } from "../../current-tick-provider";
import { ClockedEnableControl, EnableControl } from "../../enable-control";
import { Resettable } from "../../resettable";

/**
 * Enable control for fractional swings that limits swings per sub-cycle.
 * 
 * This control tracks which sub-cycle we're in based on the current tick,
 * and limits the number of swings to the value specified in the distribution
 * for that sub-cycle.
 * 
 * After completing the allowed swings, the inserter is allowed to swing back
 * to the source and pick up for 1 tick to clear the machine's output buffer.
 * This prevents output blocking while still limiting the number of deliveries.
 * The inserter will complete its delivery swing if it has items in hand.
 * 
 * Implements ControlLogic to track state transitions every tick via executeForTick().
 * A "swing" is counted when the inserter goes through DROP_OFF state and then
 * transitions out of it (meaning items were delivered).
 * 
 * Optional enable_start_per_subcycle allows "just in time" enabling - the inserter
 * won't be enabled until that tick offset within each sub-cycle. This prevents
 * the inserter from waiting on a machine to craft items.
 */
export class FractionalSwingEnableControl implements EnableControl, Resettable, ControlLogic {
    
    private last_status: InserterStatus | null = null;
    private swing_count_in_subcycle: number = 0;
    private current_subcycle: number = -1;
    private offset: number = 0;
    private buffer_clear_started: boolean = false;
    private buffer_clear_pickup_done: boolean = false;
    private buffer_clear_complete: boolean = false;

    constructor(
        private readonly swings_per_subcycle: number[],
        private readonly base_cycle_duration: number,
        private readonly inserter_status_provider: () => InserterStatus,
        private readonly tick_provider: TickProvider,
        private readonly enable_start_per_subcycle?: number[],
        private readonly has_items_in_hand_provider?: () => boolean,
    ) { }

    /**
     * Returns true if the inserter has completed all allowed swings for the current sub-cycle
     * and is now in "buffer clear" mode. During buffer clear mode, the inserter should be
     * allowed to pick up partial stacks (less than stack_size) to clear the source machine's
     * output buffer.
     */
    public isInBufferClearMode(): boolean {
        const current_tick = this.tick_provider.getCurrentTick() + this.offset;
        const extended_period = this.base_cycle_duration * this.swings_per_subcycle.length;
        const adjusted_tick = ((current_tick % extended_period) + extended_period) % extended_period;
        const subcycle = Math.floor(adjusted_tick / this.base_cycle_duration);
        const max_swings = this.swings_per_subcycle[subcycle] ?? 0;
        
        return this.swing_count_in_subcycle >= max_swings;
    }

    /**
     * Called every tick to track state transitions.
     * This ensures we see all states including DROP_OFF and SWING.
     */
    public executeForTick(): void {
        const current_tick = this.tick_provider.getCurrentTick() + this.offset;
        const extended_period = this.base_cycle_duration * this.swings_per_subcycle.length;
        const adjusted_tick = ((current_tick % extended_period) + extended_period) % extended_period;
        const subcycle = Math.floor(adjusted_tick / this.base_cycle_duration);
        
        // Reset swing count when entering a new sub-cycle
        if (subcycle !== this.current_subcycle) {
            this.current_subcycle = subcycle;
            this.swing_count_in_subcycle = 0;
            this.buffer_clear_started = false;
            this.buffer_clear_pickup_done = false;
            this.buffer_clear_complete = false;
        }
        
        const current_status = this.inserter_status_provider();
        const max_swings = this.swings_per_subcycle[subcycle] ?? 0;
        
        // Count a completed swing when transitioning OUT of DROP_OFF
        // This means items were delivered
        if (this.last_status === InserterStatus.DROP_OFF && current_status !== InserterStatus.DROP_OFF) {
            this.swing_count_in_subcycle++;
            
            // If we just completed a swing AFTER buffer clear started, mark buffer clear as complete
            // This prevents another pickup cycle after delivering buffer clear items
            if (this.buffer_clear_started) {
                this.buffer_clear_complete = true;
            }
        }
        
        // Track when the inserter enters PICKUP after completing all allowed swings
        // This is the "buffer clearing" pickup - only allow ONE tick of pickup then force swing
        if (this.swing_count_in_subcycle >= max_swings && !this.buffer_clear_complete) {
            if (this.last_status === InserterStatus.SWING && current_status === InserterStatus.PICKUP) {
                // Transitioning from SWING to PICKUP - this is the buffer clear pickup
                // The pickup already happened on the previous tick (when the mode transitioned)
                // So we immediately mark the pickup as done to force a transition to SWING
                this.buffer_clear_started = true;
                this.buffer_clear_pickup_done = true;
            }
        }
        
        this.last_status = current_status;
    }

    public isEnabled(): boolean {
        const current_tick = this.tick_provider.getCurrentTick() + this.offset;
        const extended_period = this.base_cycle_duration * this.swings_per_subcycle.length;
        const adjusted_tick = ((current_tick % extended_period) + extended_period) % extended_period;
        const subcycle = Math.floor(adjusted_tick / this.base_cycle_duration);
        const tick_in_subcycle = adjusted_tick % this.base_cycle_duration;
        
        // Get the max swings allowed for this sub-cycle
        const max_swings = this.swings_per_subcycle[subcycle] ?? 0;
        
        // Check if we're before the enable start time for this sub-cycle
        // This implements "just in time" enabling
        if (this.enable_start_per_subcycle) {
            const enable_start = this.enable_start_per_subcycle[subcycle] ?? 0;
            if (tick_in_subcycle < enable_start && this.swing_count_in_subcycle < max_swings) {
                // Not yet time to enable, and we haven't started swinging
                return false;
            }
        }
        
        // If we haven't completed all allowed swings, stay enabled
        if (this.swing_count_in_subcycle < max_swings) {
            return true;
        }
        
        // If buffer clear is complete (items were delivered after buffer clear pickup),
        // disable the inserter until the next sub-cycle
        if (this.buffer_clear_complete) {
            return false;
        }
        
        // After completing swings, allow the inserter to complete its current action
        // and do ONE buffer clear pickup when transitioning from SWING to PICKUP
        const current_status = this.inserter_status_provider();
        
        // If the inserter has items in hand, it needs to complete the delivery
        if (this.has_items_in_hand_provider?.()) {
            return true;
        }
        
        // Allow SWING state (returning to source, or delivering buffer clear items)
        if (current_status === InserterStatus.SWING) {
            return true;
        }
        
        // Allow DROP_OFF state (delivering buffer clear items)
        if (current_status === InserterStatus.DROP_OFF) {
            return true;
        }
        
        // Allow PICKUP only if buffer clear has started (transitioning from SWING)
        // and the pickup hasn't been done yet (only allow 1 tick of pickup)
        if (current_status === InserterStatus.PICKUP && this.buffer_clear_started && !this.buffer_clear_pickup_done) {
            return true;
        }
        
        // Disable otherwise - this catches:
        // - IDLE state after buffer clear is done
        // - PICKUP state before buffer clear started (shouldn't happen normally)
        // - PICKUP state after buffer clear pickup is done (force transition to SWING)
        return false;
    }

    public reset(): void {
        this.offset = -this.tick_provider.getCurrentTick();
        this.swing_count_in_subcycle = 0;
        this.current_subcycle = -1;
        this.last_status = null;
        this.buffer_clear_started = false;
        this.buffer_clear_pickup_done = false;
        this.buffer_clear_complete = false;
    }
}

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