import assert from "assert";
import { assertIsMachineState, DrillState, DrillStatus, EntityState, MachineState } from "../../../state";
import { DrillMode } from "./drill-mode";
import { Item } from "../../../data/factorio-data-types";

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
        // the actual limit of how much the drill can insert into a machine per tick is the automated insertion limit + 64
        // however, in practice it is observed that the mining drill will stop at a minimum of 114 items
        // the assumption is due to the stack size of stone being 50 + 64 = 114

        const automated_insertion_limit = this.sink_automated_insertion_limit;
        const mined_item_stack_size = this.mined_item.stack_size;
        const max_insertion_per_tick = Math.min(mined_item_stack_size, automated_insertion_limit);
        return max_insertion_per_tick + 64;
    }

    private get mined_item(): Item {
        return this.state.drill.item;
    }

    private get sink_automated_insertion_limit(): number {
        const sink_state = this.sink_state;
        const machine_input = sink_state.machine.inputs.get(this.mined_item.name);
        assert(machine_input, `Machine ${sink_state.entity_id} does not have an input for ${this.mined_item.name}`);
        return machine_input.automated_insertion_limit.quantity;
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