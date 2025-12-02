import { ItemName } from "../../data/factorio-data-types";
import { EntityState } from "../../state/entity-state";
import { ReadableEntityStateRegistry } from "../../state/entity-state-registry";
import { InserterState, InserterStatus } from "../../state/inserter-state";
import { MachineState } from "../../state/machine-state";
import { InserterStateControlLogic } from "./inserter-state-control-logic";

export class InserterIdleControlLogic implements InserterStateControlLogic {
    constructor(
        private readonly inserterState: InserterState,
        private readonly entityStateRegistry: ReadableEntityStateRegistry,
    ) { }

    public onEnter(): void {
        // no-op
    }

    public onExit(): void {
        // no-op
    }

    public executeForTick(): void {
        const sink = this.sink_entity_state;

        if (!entityAcceptsItemsFromInserter(this.inserterState, sink)) {
            return;
        }

        const source = this.source_entity_state

        if (EntityState.isBelt(source)) {
            this.inserterState.status = InserterStatus.PICKUP;
            return;
        }

        if (EntityState.isMachine(source) && this.shouldPickupFromMachine(this.inserterState, source)) {
            this.inserterState.status = InserterStatus.PICKUP;
            return;
        }
    }

    private shouldPickupFromMachine(state: InserterState, source: MachineState): boolean {

        // TODO: this should be configurable per inserter
        const pickup_amount_condition = 1;

        for (const item_name of state.inserter.filtered_items) {
            if (source.inventoryState.getQuantity(item_name) >= pickup_amount_condition) {
                return true;
            }
        }
        return false;
    }

    private get source_entity_state(): EntityState {
        return this.entityStateRegistry.getStateByEntityIdOrThrow(this.inserterState.inserter.source.entity_id);
    }

    private get sink_entity_state(): EntityState {
        return this.entityStateRegistry.getStateByEntityIdOrThrow(this.inserterState.inserter.sink.entity_id);
    }
}


function entityAcceptsItemsFromInserter(inserter_state: InserterState, entity: EntityState): boolean {

    if (EntityState.isBelt(entity)) {
        return true;
    }


    for (const item_name of inserter_state.inserter.filtered_items) {
        if (entityAcceptsItem(entity, item_name)) {
            return true;
        }
    }

    return false;
}

function entityAcceptsItem(entity: EntityState, item_name: ItemName): boolean {

    if (EntityState.isBelt(entity)) {
        return true;
    }

    if (EntityState.isMachine(entity)) {
        return !MachineState.machineInputIsBlocked(entity, item_name);
    }

    return false;
}