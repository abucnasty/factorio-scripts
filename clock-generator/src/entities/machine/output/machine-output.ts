import Fraction from "fractionability";
import { ProductionRate } from "./production-rate";
import { Ingredient } from "../../../data/factorio-data-types";
import { OutputBlock } from "./output-block";

export interface MachineOutput {
    readonly item_name: string;
    readonly amount_per_craft: Fraction;
    readonly production_rate: ProductionRate;
    readonly ingredient: Ingredient;
    readonly outputBlock: OutputBlock;
}