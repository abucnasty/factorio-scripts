import { Inserter } from "../crafting/inserter";
import { INSERTER_STATUS, InserterState } from "../state/inserter-state";
import { InventoryItem } from "../state/inventory-state";
import { MachineState } from "../state/machine-state";
import { ControlLogic } from "./control-logic";

export class InserterControlLogic implements ControlLogic {

    constructor(
        private readonly state: InserterState,
        private readonly source: MachineState | null,
        private readonly target: MachineState | null,
    ) {}

    execute(): void {

        const source = this.source;
        const target = this.target;

        if (source == null) {

        }

        if(this.state.status === INSERTER_STATUS.IDLE) {
            if(source)
        }
        this.state.advanceTicks(1);

        if (this.state.hasItemsInHand()) {

        }
    }


    private handleTransferToTarget() {
        if(this.state.hasItemsInHand() && this.target != null) {
            const target = this.target;
            const source = this.source;
            const state = this.state;
            const handContents = state.getHandContentsOrThrow();
            const targetInventory = target.inventoryState;

            if (!target.isUnderAutomatedInsertionLimit(handContents.item_name)) {
                throw new Error(`Target machine ${target.machine.id} is over automated insertion limit for item ${handContents.item_name}`);
            }

            targetInventory.addQuantity(handContents.item_name, handContents.quantity);
            state.dropItemsFromHand(handContents.item_name);
        }
    }

    public getSourcePickupInventory(): InventoryItem {
        if (this.source == null) {
            // assume belt
            return {
                item_name: this.state.inserter.source.ingredient_name!,
                quantity: this.state.inserter.stack_size,
            }
        }

        if (this.target == null) {

        }

    }

    
}