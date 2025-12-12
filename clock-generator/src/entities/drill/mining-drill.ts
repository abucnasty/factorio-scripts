import { MiningDrillConfig } from "../../config/config";
import { FactorioDataService } from "../../data/factorio-data-service";
import { MiningDrillSpec, Resource } from "../../data/factorio-data-types";
import { Entity } from "../entity";
import { EntityId } from "../entity-id";
import { CraftingRate } from "../machine/traits";
import { MiningProductivity } from "./mining-productivity";
import { fraction } from "fractionability";
import { ProductionRate } from "../machine";

export const MiningDrillType = {
    ELECTRIC_MINING_DRILL: "electric-mining-drill",
    BURNER_MINING_DRILL: "burner-mining-drill",
    BIG_MINING_DRILL: "big-mining-drill"
} as const;

export type MiningDrillType = typeof MiningDrillType[keyof typeof MiningDrillType];

export interface MiningDrillMetadata {
    type: MiningDrillType;
    resource: Resource;
}

export interface MiningDrill extends Entity, MiningProductivity {
    production_rate: ProductionRate;
    crafting_rate: CraftingRate,
    meta: MiningDrillMetadata
}

function create(args: {
    productivity: MiningProductivity,
    id: number,
    type: MiningDrillType,
    resource: Resource,
    crafting_rate: CraftingRate,
    production_rate: ProductionRate
}): MiningDrill {
    return {
        productivity: args.productivity.productivity,
        entity_id: EntityId.forDrill(args.id),
        meta: {
            type: args.type,
            resource: args.resource
        },
        crafting_rate: args.crafting_rate,
        production_rate: args.production_rate
    }
}

function createCraftingRate(
    spec: MiningDrillSpec,
    resource: Resource,
    speed_bonus: number
): CraftingRate {

    const crafting_speed = spec.mining_speed + spec.mining_speed * speed_bonus
    const energy_required = resource.minable.mining_time
    // drills always mine 1 item per craft
    const amount_per_craft = fraction(1)

    return CraftingRate.fromCraftingSpeed(
        amount_per_craft,
        crafting_speed,
        energy_required
    )
}


function createFromConfig(mining_prod: MiningProductivity, config: MiningDrillConfig): MiningDrill {

    const resource: Resource = FactorioDataService.getResourceOrThrow(config.mined_item_name)

    const spec = FactorioDataService.getMiningDrillSpec(config.type)

    const crafting_rate = createCraftingRate(
        spec,
        resource,
        config.speed_bonus,
    )

    const production_rate = ProductionRate.fromCraftingRate(resource.minable.result, crafting_rate, mining_prod.productivity.value)

    return create({
        productivity: mining_prod,
        id: config.id,
        type: config.type,
        resource: resource,
        crafting_rate: crafting_rate,
        production_rate: production_rate
    })
}

export const MiningDrill = {
    fromConfig: createFromConfig
}