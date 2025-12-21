import { assertIsMachineState, DrillState, DrillStatus, EntityState, MachineState } from "../../../state";
import { DrillMode } from "./drill-mode";
import { Item } from "../../../data";
import { miningDrillMaxInsertion } from "../../../entities";

export class DrillWorkingMode implements DrillMode {

    public readonly status = DrillStatus.WORKING;

    private readonly sink_state: MachineState

    constructor(
        private readonly state: DrillState,
        sink_state: EntityState,
    ) {
        assertIsMachineState(sink_state);
        this.sink_state = sink_state;
    }

    public onEnter(fromMode: DrillMode): void { }
    public onExit(toMode: DrillMode): void { }

    /**
     * HACK alert!! 
     * 
     * this currently makes a very large assumption that the drill will mine much more than 1 item per tick
     * 
     * this should be implemented using the same logic that an assembly machine uses for crafting progress and
     * bonus progress but is simplified for now
     */
    public executeForTick(): void {

        if (!this.sink_is_under_insertion_limit) {
            // cannot insert into the machine
            return;
        }
        const drill_inventory = this.state.inventoryState;
        const drill_item_quantity = drill_inventory.getItemOrThrow(this.mined_item.name).quantity
        const sink_inventory_state = this.sink_state.inventoryState;


        const max_amount_to_transfer = this.mining_insertion_limit - this.sink_current_inventory_quantity;
        if (drill_item_quantity >= max_amount_to_transfer) {
            drill_inventory.removeQuantity(this.mined_item.name, max_amount_to_transfer);
            sink_inventory_state.addQuantity(this.mined_item.name, max_amount_to_transfer);
            return;
        }

        // perform mining operation

        // this is a hack to just floor the value instead of adjusting the crafting and bonus progress
        const amount_this_tick = Math.floor(this.state.drill.production_rate.amount_per_tick.toDecimal())
        drill_inventory.addQuantity(this.mined_item.name, amount_this_tick);

        const available_quantity = drill_inventory.getItemOrThrow(this.mined_item.name).quantity;

        const amount_to_transfer = Math.min(max_amount_to_transfer, available_quantity)
        drill_inventory.removeQuantity(this.mined_item.name, amount_to_transfer);
        sink_inventory_state.addQuantity(this.mined_item.name, amount_to_transfer);
    }

    private get mining_insertion_limit(): number {
        return miningDrillMaxInsertion(
            this.state.drill,
            this.sink_state.machine,
        );
    }

    private get mined_item(): Item {
        return this.state.drill.item;
    }

    private get sink_current_inventory_quantity(): number {
        const sink_state = this.sink_state;
        const sink_inventory = sink_state.inventoryState;
        const inventory_item = sink_inventory.getItemOrThrow(this.mined_item.name);
        return inventory_item.quantity;
    }

    private get sink_is_under_insertion_limit(): boolean {
        const limit = this.mining_insertion_limit;
        return this.sink_current_inventory_quantity < limit;
    }


}