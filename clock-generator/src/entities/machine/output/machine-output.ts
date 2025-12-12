import Fraction from "fractionability";
import { ProductionRate } from "./production-rate";
import { OutputBlock } from "./output-block";
import { EnrichedIngredient } from "../../../data/factorio-data-service";

export interface MachineOutput {
    readonly item_name: string;
    readonly amount_per_craft: Fraction;
    readonly production_rate: ProductionRate;
    readonly ingredient: EnrichedIngredient;
    readonly outputBlock: OutputBlock;
}