import { fraction } from "fractionability";
import { CraftingSequence, InserterTransfer } from "../crafting/sequence/single-crafting-sequence";
import { OpenRange } from "../data-types";
import { EntityId, EntityRegistry, Inserter } from "../entities";

export function printCraftSnapshots(craftingSequence: CraftingSequence) {
    console.log("------------------------------")
    console.log("craft snapshots:")
    craftingSequence.craft_events.forEach((craft) => {
        console.log(`Craft ${craft.craft_index}:`);
        console.log(`- Craft Progress: ${craft.machine_state.craftingProgress.progress.toFixed(3)}`);
        console.log(`- Bonus Progress: ${craft.machine_state.bonusProgress.progress.toFixed(3)}`);
        console.log(`- Tick Range: [${craft.tick_range.start_inclusive}, ${craft.tick_range.end_inclusive}]`);
        console.log(`- Machine Status: ${craft.machine_state.status}`);
        craft.machine_state.inventoryState.getAllItems().forEach((item) => {
            console.log(`  - Inventory: ${item.item_name} = ${item.quantity}`);
        })
    })
    console.log("------------------------------")
}

export function printCraftingSequence(
    craftingSequence: CraftingSequence,
    relative_tick_mod: number = 0
) {
    printCraftingStatistics(craftingSequence);
    printInserterTransfers(craftingSequence.inserter_transfers, relative_tick_mod);
}

export function printCraftingStatistics(
    craftingSequence: CraftingSequence,
): void {
    const machine = craftingSequence.craft_events[craftingSequence.craft_events.length - 1].machine_state.machine;
    const crafts_completed = craftingSequence.craft_events.length;
    const total_crafted = machine.output.amount_per_craft.toDecimal() * crafts_completed;

    const first_craft = craftingSequence.craft_events[0];
    const final_craft = craftingSequence.craft_events[craftingSequence.craft_events.length - 1];
    const total_crafting_duration = OpenRange.from(first_craft.tick_range.start_inclusive, final_craft.tick_range.end_inclusive).duration()
    const simulation_time_ms = craftingSequence.statistics?.simulation_time_ms ?? 0;
    const simulated_ticks = craftingSequence.statistics?.simulated_ticks ?? 0;
    const average_ups = simulation_time_ms > 0 ? (simulated_ticks / (simulation_time_ms / 1000)) : 0;
    const average_items_per_second = fraction(total_crafted).divide(total_crafting_duration.seconds);
    console.log("------------------------------")
    console.log(`Crafted ${total_crafted} ${machine.output.item_name} using machine ${machine.entity_id}`);
    console.log(`Simulated ${crafts_completed} crafts over ${craftingSequence.total_duration.ticks} ticks`);
    console.log(`Average items per second: ${average_items_per_second.toDecimal()}`);
    console.log(`Simulation Time: ${simulation_time_ms} ms`);
    console.log(`Simulation UPS : ${average_ups.toFixed(2)} UPS`);
    console.log("------------------------------")
}

export function printInserterTransfers(
    inserter_transfers: Map<EntityId, InserterTransfer[]>,
    relative_tick_mod: number = 0
): void {
    inserter_transfers!.forEach((transfers, entityId) => {
        console.log(`Inserter Transfer Ranges for ${entityId}`);
        transfers.forEach((transfer) => {
            const start_inclusive = transfer.tick_range.start_inclusive;
            const end_inclusive = transfer.tick_range.end_inclusive;
            if (relative_tick_mod > 0) {
                const start_mod = start_inclusive % relative_tick_mod;
                const end_mod = end_inclusive % relative_tick_mod;
                console.log(`- [${start_inclusive} - ${end_inclusive}](${start_mod} - ${end_mod}) (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
                return;
            }
            console.log(`- [${start_inclusive} - ${end_inclusive}] (${transfer.tick_range.duration().ticks} ticks) ${transfer.item_name}`);
        })
    })
}

export function printInserterActiveRanges(
    inserter_active_ranges: Map<EntityId, OpenRange[]>,
    entityRegistry: EntityRegistry,
    relative_tick_mod: number = 0
): void {
    inserter_active_ranges!.forEach((active_ranges, entity_id) => {
        const inserter: Inserter = entityRegistry.getEntityByIdOrThrow(entity_id);
        const items = Array.from(inserter.filtered_items).join(", ");
        console.log("------------------------------")
        console.log(`Inserter Active Ranges for ${entity_id} ${items}`);
        active_ranges.forEach((active_range) => {
            const start_inclusive = active_range.start_inclusive;
            const end_inclusive = active_range.end_inclusive;
            if (relative_tick_mod > 0) {
                const start_mod = start_inclusive % relative_tick_mod;
                const end_mod = end_inclusive % relative_tick_mod;
                console.log(`- ${active_range} (${start_mod} - ${end_mod}) (${active_range.duration().ticks} ticks)`);
                return;
            }
            console.log(`- [${start_inclusive} - ${end_inclusive}] (${active_range.duration().ticks} ticks)`);
        })
    })
}