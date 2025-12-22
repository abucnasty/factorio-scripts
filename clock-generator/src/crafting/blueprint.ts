import Fraction from "fractionability";
import { FactorioBlueprint, BlueprintBuilder } from "../blueprints/blueprint";
import { Position, SignalId } from "../blueprints/components";
import { DeciderCombinatorEntity } from "../blueprints/entity/decider-combinator";
import { Duration, OpenRange } from "../data-types";
import { ReadableEntityRegistry, Inserter, EntityId, Entity } from "../entities";
import { InventoryTransfer } from "./sequence/inventory-transfer";
import { InventoryTransferHistory } from "./sequence/inventory-transfer-history";
import { CraftingCyclePlan } from "./sequence/cycle/crafting-cycle";

function createDeciderCombinatorForTransfers(
    inventory_transfers: InventoryTransfer[],
    entity_id: EntityId,
    entity_registry: ReadableEntityRegistry,
    cycle: CraftingCyclePlan,
    number_of_cycles: number,
    position: Position
): DeciderCombinatorEntity {
    const entity = entity_registry.getEntityByIdOrThrow(entity_id)
    const entity_number = entity_id.id.split(":")[1]
    let outputSignalId = SignalId.virtual(`signal-${entity_number}`);

    let description_lines: string[] = []

    const swing_counts = cycle.entity_transfer_map.get(entity_id);

    const items = new Set<string>();

    if (Entity.isInserter(entity)) {
        entity.filtered_items.forEach(item_name => items.add(item_name));
    } else if (Entity.isDrill(entity)) {
        items.add(entity.item.name);
    } else {
        throw new Error(`Entity ${entity_id} is not an inserter or drill`);
    }

    if (swing_counts) {
        description_lines = inserterSwingCountDescriptionLines(
            entity_id,
            items,
            swing_counts.total_transfer_count,
            swing_counts.total_transfer_count.multiply(number_of_cycles)
        )
    }

    if (items.size === 1) {
        outputSignalId = SignalId.item(Array.from(items)[0])
    }

    const ranges = OpenRange.reduceRanges(inventory_transfers.map(transfer => transfer.tick_range));

    const deciderCombinator = DeciderCombinatorEntity
        .fromRanges(
            SignalId.clock,
            ranges,
            Array.from(items).map(item_name => SignalId.item(item_name))
        )
        .setPosition(position)
        .setMultiLinePlayerDescription(description_lines)
        .build();

    return deciderCombinator
}

function inserterSwingCountDescriptionLines(
    inserter_id: EntityId,
    item_names: Set<string>,
    swing_count_per_cycle: Fraction,
    total_swings: Fraction
): string[] {
    const inserter_number = inserter_id.id.split(":")[1];
    const item_icons = Array.from(item_names).map(item_name => SignalId.toDescriptionString(SignalId.item(item_name)));

    const lines = []

    if (item_icons.length === 1) {
        lines.push(`Inserter ${inserter_number} for ${item_icons[0]}`)

    } else {
        lines.push(`Inserter ${inserter_number} for (${item_icons.join("|")})`)
    }

    lines.push("Swing Counts:")
    lines.push(`- per cycle: ${swing_count_per_cycle}`)
    lines.push(`- total: ${total_swings}`)

    return lines
}

function generateClockDescriptionLines(
    final_output_item_name: string,
    cycle: CraftingCyclePlan,
    total_duration: Duration,
): string[] {

    const cycle_count = total_duration.ticks / cycle.total_duration.ticks;
    const output_item_icon = SignalId.toDescriptionString(SignalId.item(final_output_item_name))

    return [
        `Clock for ${output_item_icon}:`,
        `- Cycle Duration: ${cycle.total_duration.ticks} ticks`,
        `- Cycle Count: ${cycle_count} cycles`,
        `- Total Duration: ${total_duration.ticks} ticks`
    ]
}


export function createSignalPerInserterBlueprint(
    final_output_item_name: string,
    cycle: CraftingCyclePlan,
    total_duration: Duration,
    history: InventoryTransferHistory,
    entityRegistry: ReadableEntityRegistry
): FactorioBlueprint {

    const inventory_transfers = history.getAllTransfers()

    const blueprint_label: string = final_output_item_name + " Inserter Clock Schedule"
    let x = 0.5;


    const clock = DeciderCombinatorEntity
        .clock(total_duration.ticks, 1)
        .setPosition(Position.fromXY(x, 0))
        .setMultiLinePlayerDescription(
            generateClockDescriptionLines(
                final_output_item_name,
                cycle,
                total_duration
            )
        )
        .build();

    const deciderCombinatorEntities: DeciderCombinatorEntity[] = []

    const sortedEntityIds = Array.from(inventory_transfers.keys()).sort((a, b) => a.id.localeCompare(b.id));

    sortedEntityIds.forEach(entityId => {
        const transfers = inventory_transfers.get(entityId)!;
        x += 1;
        deciderCombinatorEntities.push(
            createDeciderCombinatorForTransfers(
                transfers,
                entityId,
                entityRegistry,
                cycle,
                total_duration.ticks / cycle.total_duration.ticks,
                Position.fromXY(x, 0)
            )
        )
    })

    return new BlueprintBuilder()
        .setLabel(blueprint_label)
        .setEntities([
            clock,
            ...deciderCombinatorEntities
        ])
        .setWires([[1, 2, 1, 4]])
        .build();
}