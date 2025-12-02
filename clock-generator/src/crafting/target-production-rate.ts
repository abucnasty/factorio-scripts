import Fraction, {fraction} from "fractionability";
import { ProductionRate } from "../entities";
import { TICKS_PER_SECOND } from "../data-types";
import { TargetProductionRateConfig } from "../config/config";

export interface TargetProductionRate {
    machine_production_rate: ProductionRate;
    machine_count: number;
    total_production_rate: ProductionRate;
}


function fromConfig(config: TargetProductionRateConfig): TargetProductionRate {

    const recipe = config.recipe;

    const target_output_per_tick = fraction(config.items_per_second)
        .divide(TICKS_PER_SECOND)

    const target_output_per_machine_per_tick = target_output_per_tick
        .divide(config.machines);

    return {
        machine_production_rate: ProductionRate.perTick(recipe, target_output_per_machine_per_tick),
        machine_count: config.machines,
        total_production_rate: ProductionRate.perTick(recipe, target_output_per_tick),
    };
}

export const TargetProductionRate = {
    fromConfig: fromConfig
}