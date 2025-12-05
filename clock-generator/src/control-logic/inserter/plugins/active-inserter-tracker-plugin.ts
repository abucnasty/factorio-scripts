import { OpenRange } from "../../../data-types";
import { InserterStatus } from "../../../state";
import { TickProvider } from "../../current-tick-provider";
import { ModePlugin, Transition } from "../../mode";
import { InserterMode } from "../modes";


export type ActiveStatusCallback = (active_range: OpenRange) => void

export class ActiveInserterTrackerPlugin implements ModePlugin<InserterMode> {

    static readonly active_statuses: ReadonlySet<InserterStatus> = new Set([
        InserterStatus.DROP_OFF,
        InserterStatus.PICKUP,
        InserterStatus.SWING,
    ]);

    constructor(
        private readonly tick_provider: TickProvider,
        private readonly callback: ActiveStatusCallback,
    ) { }

    private entered_tick: number | null = null;

    onTransition(fromMode: InserterMode, transition: Transition<InserterMode>): void {
        const from_status = fromMode.status
        const to_status = transition.toMode.status

        const from_active = this.isActiveStatus(from_status);
        const from_inactive = !from_active;
        const to_active = this.isActiveStatus(to_status);
        const to_inactive = !to_active;

        if (from_active && to_inactive) {
            this.invokeCallback();
            this.reset();
            return;
        }

        if (from_inactive && to_active) {
            this.entered_tick = this.tick_provider.getCurrentTick();
        }
    }

    private invokeCallback(): void {
        if (this.entered_tick == null) {
            return
        }
        const current_tick = this.tick_provider.getCurrentTick();
        this.callback(OpenRange.from(
            this.entered_tick,
            current_tick,
        ));
    }

    private reset(): void {
        this.entered_tick = null;
    }

    private isActiveStatus(status: InserterStatus): boolean {
        return ActiveInserterTrackerPlugin.active_statuses.has(status);
    }
}