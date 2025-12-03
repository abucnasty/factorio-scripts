import { MachineStatus } from "../../../state";
import { MachineMode } from "./machine-mode";

export class MachineIngredientShortageMode implements MachineMode {
    public readonly status = MachineStatus.INGREDIENT_SHORTAGE;

    public onEnter(fromMode: MachineMode): void {}

    public onExit(toMode: MachineMode): void {}

    public executeForTick(): void {}
}