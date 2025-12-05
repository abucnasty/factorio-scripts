import { InserterTransfer } from "../../../crafting/crafting-sequence";
import { OpenRange } from "../../../data-types";
import { InserterHandContents, InserterState, InserterStatus } from "../../../state";
import { TickProvider } from "../../current-tick-provider";
import { ModePlugin, Transition } from "../../mode";
import { InserterMode } from "../modes";


export interface TransferSnapshot {
    item_name: string;
    pickup_tick: number;
    tick_range: OpenRange;
    transition: {
        from_status: InserterStatus;
        to_status: InserterStatus;
    }
}

export type TransferStatusCallback = (snapshot: TransferSnapshot) => void

interface InserterSnapshot {
    status: InserterStatus;
    tick: number;
    held_item: InserterHandContents | null;
}

export class InserterTransferTrackerPlugin implements ModePlugin<InserterMode> {

    static readonly transfer_statuses: ReadonlySet<InserterStatus> = new Set([
        InserterStatus.DROP_OFF,
        InserterStatus.PICKUP,
    ]);

    static readonly transfer_complete_statuses: ReadonlySet<InserterStatus> = new Set([
        InserterStatus.DISABLED,
        InserterStatus.IDLE,
        InserterStatus.PICKUP,
    ]);

    constructor(
        private readonly tick_provider: TickProvider,
        private readonly inserter_state: InserterState,
        private readonly callback: TransferStatusCallback,
    ) { }

    private entered_tick: Map<InserterStatus, InserterSnapshot> = new Map();
    private exited_tick: Map<InserterStatus, InserterSnapshot> = new Map();

    onTransition(fromMode: InserterMode, transition: Transition<InserterMode>): void {
        const last_pickup = this.entered_tick.get(InserterStatus.PICKUP);
        this.recordExitedTick(fromMode.status);
        this.recordEnteredTick(transition.toMode.status);


        const from_status = fromMode.status
        const to_status = transition.toMode.status

        if (from_status !== InserterStatus.SWING) {
            return;
        }

        if (to_status === InserterStatus.DROP_OFF) {
            return;
        }

        const exited = this.exited_tick.get(InserterStatus.PICKUP);
        const current_tick = this.tick_provider.getCurrentTick();

        if (!last_pickup) {
            return;
        }

        const inserter_transfer: TransferSnapshot = {
            pickup_tick: last_pickup.tick,
            item_name: exited!.held_item?.item_name ?? "unknown",
            tick_range: OpenRange.from(
                last_pickup.tick,
                current_tick,
            ),
            transition: {
                from_status: from_status,
                to_status: to_status,
            }
        };
        this.callback(inserter_transfer);

    }

    private recordEnteredTick(status: InserterStatus): void {
        this.entered_tick.set(status, {
            status,
            tick: this.tick_provider.getCurrentTick(),
            held_item: InserterHandContents.clone(this.inserter_state.held_item),
        });
    }
    private recordExitedTick(status: InserterStatus): void {
        this.exited_tick.set(status, {
            status,
            tick: this.tick_provider.getCurrentTick(),
            held_item: InserterHandContents.clone(this.inserter_state.held_item),
        });
    }

}