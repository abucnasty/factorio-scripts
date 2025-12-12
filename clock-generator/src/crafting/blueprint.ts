import { FactorioBlueprint, BlueprintBuilder } from "../blueprints/blueprint";
import { Position, SignalId } from "../blueprints/components";
import { DeciderCombinatorEntity } from "../blueprints/entity/decider-combinator";
import { Duration, OpenRange } from "../data-types";
import { ReadableEntityRegistry, Inserter, EntityId } from "../entities";
import { CraftingSequence, InserterTransfer } from "./sequence/single-crafting-sequence";


function createClockFromCraftingSequence(
    craftingSequence: CraftingSequence,
    position: Position
): DeciderCombinatorEntity {
    const totalClockTicks = craftingSequence.total_duration.ticks;
    return DeciderCombinatorEntity
        .clock(totalClockTicks, 1)
        .setPosition(position)
        .build();
}

function createDeciderCombinatorForTransfers(
    inserter_transfers: InserterTransfer[],
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

    const swing_count = inserter_transfers.length

    description_lines.push("")
    description_lines.push(`Total Swings: ${swing_count}`)

    

    if (items.size === 1) {
        outputSignalId = SignalId.item(Array.from(items)[0])
    }

    const ranges = OpenRange.reduceRanges(inserter_transfers.map(transfer => transfer.tick_range));

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

export function createInserterControlLogicFromActiveRanges(
    craftingSequence: CraftingSequence,
    entityRegistry: ReadableEntityRegistry
): FactorioBlueprint {
    const machine = craftingSequence.craft_events[0].machine_state.machine;
    let x = 0.5;
    const clock = createClockFromCraftingSequence(
        craftingSequence,
        Position.fromXY(x, 0)
    );

    const deciderCombinatorEntities: DeciderCombinatorEntity[] = []

    craftingSequence.inserter_active_ranges.forEach((active_ranges, entity_id) => {
        x += 1;
        deciderCombinatorEntities.push(
            createDeciderCombinatorForActiveRanges(
                active_ranges,
                entity_id,
                entityRegistry,
                Position.fromXY(x, 0)
            )
        )
    })

    return new BlueprintBuilder()
        .setLabel(machine.output.item_name + " Inserter Clock Schedule")
        .setEntities([
            clock,
            ...deciderCombinatorEntities
        ])
        .setWires([[1, 2, 1, 4]])
        .build();
}

export function createSignalPerInserterBlueprint(
    final_output_item_name: string,
    total_duration: Duration,
    inserter_transfers: Map<EntityId, InserterTransfer[]>,
    entityRegistry: ReadableEntityRegistry
): FactorioBlueprint {
    
    const blueprint_label: string = final_output_item_name + " Inserter Clock Schedule"
    let x = 0.5;
    const clock = DeciderCombinatorEntity
        .clock(total_duration.ticks, 1)
        .setPosition(Position.fromXY(x, 0))
        .build();

    const deciderCombinatorEntities: DeciderCombinatorEntity[] = []

    inserter_transfers.forEach((transfers, entityId) => {
        x += 1;
        deciderCombinatorEntities.push(
            createDeciderCombinatorForTransfers(
                transfers,
                entityId,
                entityRegistry,
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

export function createSplitItemSignalBlueprint(
    craftingSequence: CraftingSequence,
    entityRegistry: ReadableEntityRegistry
) {
    const machine = craftingSequence.craft_events[0].machine_state.machine;
    let x = 0.5;
    const clock = createClockFromCraftingSequence(
        craftingSequence,
        Position.fromXY(x, 0)
    );

    const deciderCombinatorEntities: DeciderCombinatorEntity[] = []

    for (const [inserter_id, transfers] of craftingSequence.inserter_transfers) {
        const transfers_by_item: Map<string, InserterTransfer[]> = new Map();

        for (const transfer of transfers) {
            const item_name = transfer.item_name;
            const transfers = transfers_by_item.get(item_name) ?? []
            transfers_by_item.set(item_name, transfers.concat(transfer));
        }

        for (const [item_name, item_transfers] of transfers_by_item) {
            x += 1;
            deciderCombinatorEntities.push(createDeciderCombinatorForTransfers(
                item_transfers,
                inserter_id,
                entityRegistry,
                Position.fromXY(x, 0)
            ))
        }
    }
    return new BlueprintBuilder()
        .setLabel(machine.output.item_name + " Inserter Clock Schedule")
        .setEntities([
            clock,
            ...deciderCombinatorEntities
        ])
        .setWires([[1, 2, 1, 4]])
        .build();
}