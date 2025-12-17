import Fraction from "fractionability";
import { FactorioBlueprint, BlueprintBuilder } from "../blueprints/blueprint";
import { Position, SignalId } from "../blueprints/components";
import { DeciderCombinatorEntity } from "../blueprints/entity/decider-combinator";
import { Duration, OpenRange } from "../data-types";
import { ReadableEntityRegistry, Inserter, EntityId, Entity } from "../entities";
import { CycleSpec } from "./sequence/cycle/cycle-spec";
import { InventoryTransfer } from "./sequence/inventory-transfer";

function createDeciderCombinatorForTransfers(
    inventory_transfers: InventoryTransfer[],
    entity_id: EntityId,
    entity_registry: ReadableEntityRegistry,
    cycle_spec: CycleSpec,
    number_of_cycles: number,
    position: Position
): DeciderCombinatorEntity {
    const entity = entity_registry.getEntityByIdOrThrow(entity_id)
    const entity_number = entity_id.id.split(":")[1]
    let outputSignalId = SignalId.virtual(`signal-${entity_number}`);

    let description_lines: string[] = []

    const swing_counts = cycle_spec.swing_counts.get(entity_id);

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
            swing_counts.transfer_count,
            swing_counts.transfer_count.multiply(number_of_cycles)
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
            outputSignalId
        )
        .setPosition(position)
        .setMultiLinePlayerDescription(description_lines)
        .build();

    return deciderCombinator
}

function createDeciderCombinatorForActiveRanges(
    inserter_active_ranges: OpenRange[],
    inserter_id: EntityId,
    entity_registry: ReadableEntityRegistry,
    position: Position
): DeciderCombinatorEntity {
    const inserter: Inserter = entity_registry.getEntityByIdOrThrow(inserter_id)
    const inserter_number = inserter_id.id.split(":")[1]
    let outputSignalId = SignalId.virtual(`signal-${inserter_number}`);

    let description_lines: string[] = []

    description_lines.push(`Inserter ${inserter_number} for: `)

    const items = new Set(inserter.filtered_items);

    items.forEach(item_name => {
        const item_icon = SignalId.toDescriptionString(SignalId.item(item_name))
        description_lines.push(`- ${item_icon}`)
    })

    const swing_count = Math.floor(inserter_active_ranges.map(range => range.duration().ticks).reduce((a, b) => a + b, 0) / inserter.animation.total.ticks)

    description_lines.push("")
    description_lines.push(`Total Swings: ${swing_count}`)



    if (items.size === 1) {
        outputSignalId = SignalId.item(Array.from(items)[0])
    }

    const ranges = OpenRange.reduceRanges(inserter_active_ranges);

    const deciderCombinator = DeciderCombinatorEntity
        .fromRanges(
            SignalId.clock,
            ranges,
            outputSignalId
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
    cycle_spec: CycleSpec,
    total_duration: Duration,
): string[] {

    const cycle_count = total_duration.ticks / cycle_spec.cycle_duration.ticks;

    const output_item_icon = SignalId.toDescriptionString(SignalId.item(final_output_item_name))

    return [
        `Clock for ${output_item_icon}:`,
        `- Cycle Duration: ${cycle_spec.cycle_duration.ticks} ticks`,
        `- Cycle Count: ${cycle_count} cycles`,
        `- Total Duration: ${total_duration.ticks} ticks`,
    ]
}


export function createSignalPerInserterBlueprint(
    final_output_item_name: string,
    cycle_spec: CycleSpec,
    total_duration: Duration,
    inventory_transfers: Map<EntityId, InventoryTransfer[]>,
    entityRegistry: ReadableEntityRegistry
): FactorioBlueprint {

    const blueprint_label: string = final_output_item_name + " Inserter Clock Schedule"
    let x = 0.5;


    const clock = DeciderCombinatorEntity
        .clock(total_duration.ticks, 1)
        .setPosition(Position.fromXY(x, 0))
        .setMultiLinePlayerDescription(
            generateClockDescriptionLines(
                final_output_item_name,
                cycle_spec,
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
                cycle_spec,
                total_duration.ticks / cycle_spec.cycle_duration.ticks,
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