import assert from "assert";
import { CraftingSequence, InserterTransfer } from "../crafting/crafting-sequence";
import { TargetProductionRate } from "../crafting/target-production-rate";
import { Duration, OpenRange } from "../data-types";
import { EntityRegistry, EntityId, Inserter } from "../entities";

export function refinement(args: {
    entityRegistry: EntityRegistry,
    testSequence: CraftingSequence,
    planSequence: CraftingSequence,
    targetProductionRate: TargetProductionRate,
    outputInserterId: EntityId,
    total_period: Duration,
}): CraftingSequence {

    const { testSequence, planSequence, targetProductionRate, outputInserterId, total_period, entityRegistry } = args;

    const outputMachine = testSequence.craft_events[0].machine_state.machine;

    const output_inserter: Inserter = entityRegistry.getEntityByIdOrThrow(outputInserterId)

    const finalCraftingSequence: CraftingSequence = {
        ...testSequence,
        total_duration: total_period,
    }

    const refined_transfers = new Map<EntityId, InserterTransfer[]>();
    const ticks_per_craft = outputMachine.crafting_rate.ticks_per_craft;

    // const output_buffer = Math.ceil(ticks_per_craft);
    const output_buffer = 1

    finalCraftingSequence.inserter_transfers.forEach((transfers, inserterId) => {
        if (inserterId.id === output_inserter.entity_id.id) {
            refined_transfers.set(inserterId, transfers.map(transfer => ({
                item_name: transfer.item_name,
                tick_range: OpenRange.from(
                    transfer.tick_range.start_inclusive,
                    transfer.tick_range.end_inclusive + output_buffer,
                )
            })));
            return;
        }

        const refined_transfer = transfers.map(transfer => ({
            item_name: transfer.item_name,
            tick_range: OpenRange.from(
                transfer.tick_range.start_inclusive,
                transfer.tick_range.end_inclusive,
            )
        }))

        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(inserterId);

        const last_transfer = refined_transfer[refined_transfer.length - 1];
        const pickup_buffer = inserter.animation.pickup.ticks / 2

        last_transfer.tick_range = OpenRange.from(
            last_transfer.tick_range.start_inclusive,
            last_transfer.tick_range.end_inclusive,
        ) 

        refined_transfers.set(inserterId, refined_transfer);
    })



    const output_inserter_active_transfers = finalCraftingSequence.inserter_transfers.get(output_inserter.entity_id)
    assert(output_inserter_active_transfers != undefined, `No active transfers found for output inserter with id ${output_inserter.entity_id}`);

    finalCraftingSequence.inserter_transfers = refined_transfers;

    const first_craft = finalCraftingSequence.craft_events[0];
    const final_craft = finalCraftingSequence.craft_events[finalCraftingSequence.craft_events.length - 1];


    console.log(`Refined crafting sequence:`)
    console.log(`- [${first_craft.craft_index}, ${final_craft.craft_index}] crafts`)
    console.log(`- Total crafts in cycle: ${final_craft.craft_index - first_craft.craft_index}`);

    return finalCraftingSequence
}