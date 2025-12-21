import { Ingredient } from "../../../data";
import { AutomatedInsertionLimit } from "./automated-insertion-limit";
import { ConsumptionRate } from "./consumption-rate";

export interface MachineInput {
    readonly item_name: string;
    readonly consumption_rate: ConsumptionRate;
    readonly automated_insertion_limit: AutomatedInsertionLimit;
    readonly ingredient: Ingredient;
}
