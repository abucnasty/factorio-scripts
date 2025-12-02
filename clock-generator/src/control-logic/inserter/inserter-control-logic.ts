import { EntityId } from "../../entities";
import { EntityStateRegistry, ReadableEntityStateRegistry } from "../../state/entity-state-registry";
import { InserterState, InserterStatus } from "../../state/inserter-state";
import { ControlLogic } from "../control-logic";
import { AlwaysEnabledControl, EnableControl } from "../enable-control";
import { InserterEnableControlLogic } from "../enable-control-logic";
import { InserterDropOffControlLogic } from "./inserter-drop-control-logic";
import { InserterIdleControlLogic } from "./inserter-idle-control-logic";
import { InserterPickupControlLogic } from "./inserter-pickup-control-logic";
import { InserterRotateControlLogic } from "./inserter-rotate-control-logic";
import { InserterStateControlLogic } from "./inserter-state-control-logic";
import assert from "assert";

export type InsertertStateChangeListener = (
    args: { state: InserterState, status: { from: InserterStatus, to: InserterStatus } }
) => void;

export class InserterControlLogic implements ControlLogic {

    private readonly inserterStateLogic: ReadonlyMap<InserterStatus, InserterStateControlLogic>;

    private readonly listeners: InsertertStateChangeListener[] = [];

    constructor(
        public readonly inserterState: InserterState,
        entityStateRegistry: ReadableEntityStateRegistry,
        enableControl: EnableControl = AlwaysEnabledControl,
    ) {
        const idle_control_logic = InserterEnableControlLogic.decorate(
            new InserterIdleControlLogic(inserterState, entityStateRegistry),
            enableControl,
            inserterState,
        );
        this.inserterStateLogic = new Map<InserterStatus, InserterStateControlLogic>([
            [InserterStatus.DISABLED, idle_control_logic],
            [InserterStatus.IDLE, idle_control_logic],
            [InserterStatus.ENABLED, idle_control_logic],
            [InserterStatus.PICKUP, InserterEnableControlLogic.decorate(
                new InserterPickupControlLogic(inserterState, entityStateRegistry),
                enableControl,
                inserterState,
            )],
            [InserterStatus.SWING_TO_SINK, new InserterRotateControlLogic(inserterState, entityStateRegistry)],
            [InserterStatus.DROP_OFF, new InserterDropOffControlLogic(inserterState, entityStateRegistry)],
            [InserterStatus.SWING_TO_SOURCE, new InserterRotateControlLogic(inserterState, entityStateRegistry)],
        ]);
    }

    public registerStateChangeListener(listener: InsertertStateChangeListener): void {
        this.listeners.push(listener);
    }

    public executeForTick(): void {
        const status = this.inserterState.status;
        const control_logic = this.control_logic;
        control_logic.executeForTick();
        const new_status = this.inserterState.status;

        if (new_status !== status) {
            // console.log(`Inserter ${this.inserterState.inserter.entity_id} status: ${status} -> ${new_status}`);
            control_logic.onExit();
            const next_control_logic = this.inserterStateLogic.get(new_status);
            if (!next_control_logic) {
                throw new Error(`No control logic found for inserter status: ${new_status}`);
            }
            next_control_logic.onEnter();

            for (const listener of this.listeners) {
                listener({ state: InserterState.clone(this.inserterState), status: { from: status, to: new_status } });
            }
        }
    }

    private get control_logic(): InserterStateControlLogic {
        const control_logic = this.inserterStateLogic.get(this.inserterState.status);
        assert(control_logic !== undefined, `No control logic found for inserter status: ${this.inserterState.status}`);
        return control_logic;
    }
}