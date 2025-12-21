import assert from "assert";
import Fraction, { fraction } from "fractionability";
import { Duration } from "../../../data-types/duration";
import { TargetProductionRate } from "../../target-production-rate";
import { EntityTransferCountMap } from "./swing-counts";
import { Entity, ReadableEntityRegistry } from "../../../entities";
import { ConfigOverrides } from "../../../config";

export interface CraftingCyclePlan {
    readonly total_duration: Duration;
    readonly entity_transfer_map: EntityTransferCountMap;
    readonly production_rate: TargetProductionRate;
}

export const CraftingCyclePlan = {
    create: createPlan,
    print: print,
}

function createPlan(
    target_production_rate: TargetProductionRate,
    entity_registry: ReadableEntityRegistry,
    max_possible_swings: Fraction,
    config_overrides: Partial<ConfigOverrides> = {}
): CraftingCyclePlan {

    const output_machines = entity_registry
        .getAll()
        .filter(Entity.isMachine)
        .filter(it => it.output.item_name === target_production_rate.machine_production_rate.item)

    const output_machine = output_machines[0]; // TODO: support multiple output machines
    assert(output_machine, `No machine found that produces item ${target_production_rate.machine_production_rate.item}`);

    const output_inserter = entity_registry
        .getAll()
        .filter(Entity.isInserter)
        .find(inserter => inserter.source.entity_id.id === output_machine.entity_id.id);
    assert(output_inserter, `No inserter found that feeds into machine ${output_machine.entity_id}`);


    const single_swing_period_duration = Duration.ofTicks(
        fraction(output_inserter.metadata.stack_size)
            .divide(target_production_rate.machine_production_rate.amount_per_tick)
            .toDecimal()
    )

    let swings_per_single_cycle = 1;



    if (max_possible_swings.toDecimal() >= 2) {
        swings_per_single_cycle = Math.floor(max_possible_swings.toDecimal());
    } else {
        // only single swing outputs are supported when max swings are less than 2
        // in order to support fractional swings, the timing is going to have to be scheduled based on the crafting
        // speed of the machine in order for it to be fully stable
        swings_per_single_cycle = 1;
    }

    if (config_overrides.terminal_swing_count !== undefined) {
        swings_per_single_cycle = config_overrides.terminal_swing_count;
    }

    assert(Number.isInteger(swings_per_single_cycle), `Swings per single cycle must be an integer but got ${swings_per_single_cycle}`);

    const final_period_duration = Duration.ofTicks(single_swing_period_duration.ticks * swings_per_single_cycle)

    const swing_counts = EntityTransferCountMap.create(
        output_machine,
        entity_registry,
        fraction(swings_per_single_cycle),
        output_inserter.metadata.stack_size
    )

    return {
        total_duration: final_period_duration,
        entity_transfer_map: swing_counts.clone(),
        production_rate: target_production_rate
    }
}

function print(plan: CraftingCyclePlan): void {
    console.log("----------------------")
    console.log(`Crafting Cycle Plan:`)
    console.log(`- Total Duration: ${plan.total_duration.ticks} ticks`)
    console.log(`- Entity Transfer Counts:`)
    plan.entity_transfer_map.entries_array().forEach(([entityId, transfer]) => {
        const items = transfer.item_transfers.map(it => `${it.item_name} (${it.transfer_count})`).join(", ");
        console.log(`  - ${entityId}: ${transfer.total_transfer_count} total transfers [${items}] (stack size: ${transfer.stack_size})`)
    })
    console.log("----------------------")
}