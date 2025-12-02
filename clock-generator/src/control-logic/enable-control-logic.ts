import { InserterState, InserterStatus } from "../state";
import { EnableControl } from "./enable-control";
import { InserterStateControlLogic } from "./inserter/inserter-state-control-logic";

export class InserterEnableControlLogic implements InserterStateControlLogic {

    public static decorate(controlLogic: InserterStateControlLogic, enableControl: EnableControl, inserterState: InserterState): InserterStateControlLogic {
        return new InserterEnableControlLogic(inserterState, enableControl, controlLogic);
    }

    private last_status: InserterStatus | null = null

    constructor(
        private readonly inserterState: InserterState,
        private readonly enableControl: EnableControl,
        private readonly controlLogic: InserterStateControlLogic,
    ) {}

    public onEnter(): void {
        this.controlLogic.onEnter();
    }

    public onExit(): void {
        this.controlLogic.onExit();
    }

    public executeForTick(): void {
        if (this.enableControl.isEnabled()) {
            if (this.last_status === InserterStatus.DISABLED) {
                this.inserterState.status = InserterStatus.IDLE;
            } else {
                this.controlLogic.executeForTick();
            }
        } else {
            this.inserterState.status = InserterStatus.DISABLED;
        }
        this.last_status = this.inserterState.status;
    }
}