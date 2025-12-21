import { OpenRange } from "../../../data-types";
import { MiningDrill } from "../../../entities";
import { DrillStatus } from "../../../state";
import { TickProvider } from "../../current-tick-provider";
import { InventoryTransferHistory } from "../../../crafting/sequence/inventory-transfer-history";
import { ModePlugin, Transition } from "../../mode";
import { DrillMode } from "../modes/drill-mode";

export class DrillInventoryTransferPlugin implements ModePlugin<DrillMode> {

    private last_enabled_tick: number | null = null;

    constructor(
        private readonly drill_entity: MiningDrill,
        private readonly tick_provider: TickProvider,
        private readonly transfer_history: InventoryTransferHistory,
    ) { }

    public onTransition(fromMode: DrillMode, transition: Transition<DrillMode>): void {
        if (fromMode.status === DrillStatus.DISABLED) {
            this.last_enabled_tick = this.tick_provider.getCurrentTick();
        }
        if (transition.toMode.status === DrillStatus.DISABLED && this.last_enabled_tick !== null) {
            this.transfer_history.recordTransfer(
                this.drill_entity.entity_id,
                {
                    item_name: this.drill_entity.item.name,
                    tick_range: OpenRange.from(
                        this.last_enabled_tick,
                        this.tick_provider.getCurrentTick()
                    )
                }
            )
            this.last_enabled_tick = null;
        }
    }
}

