import assert from "assert";
import { Entity, EntityId, Inserter, ReadableEntityRegistry } from "../../../entities";
import { EntityTransferCountMap } from "./swing-counts";

export interface MaxSwingCount {
    inserter: Inserter;
    max_swing_count: number;
}

export const MaxSwingCount = {
    forInserter: createForInserter,
}

function createForInserter(
    inserter_entity_id: EntityId,
    transfers_map: EntityTransferCountMap,
    entity_registry: ReadableEntityRegistry
): MaxSwingCount {
    const transfer_count = transfers_map.get(inserter_entity_id);
    assert(transfer_count !== undefined, `No transfer count found for entity ${inserter_entity_id}`);
    assert(Entity.isInserter(transfer_count.entity), `Entity ${inserter_entity_id} is not an inserter`);

    const inserter: Inserter = transfer_count.entity;
    
    
    const sink_entity = entity_registry.getEntityByIdOrThrow(inserter.sink.entity_id);

    let max_swing_count_fraction = transfer_count.transfer_count
    
    if (Entity.isMachine(sink_entity)) {
        // need to compute the ratio of the output inserters swings per period
        const output_inserter = entity_registry.getAll()
            .filter(Entity.isInserter)
            .find(i => i.source.entity_id.id === sink_entity.entity_id.id);
        assert(output_inserter !== undefined, `No output inserter found for machine ${sink_entity.entity_id}`);
        
        const output_transfer_count = transfers_map.get(output_inserter.entity_id);
        assert(output_transfer_count !== undefined, `No transfer count found for output inserter ${output_inserter.entity_id}`);

        // if the output inserter has a transfer count of 5.5, the max transfer count per cycle is 6
        // due to sometimes swinging 5 times sometimes swinging 6 times
        const max_transfer_count_per_cycle = Math.ceil(output_transfer_count.transfer_count.toDecimal());
        
        // multiply the swing count by the output inserter's transfer count for each period
        // this will be at ratio already due to the transfer map computing the ratio of swings per inserter
        // so in this period, the inserter needs to swing enough times to keep up with the output inserter
        max_swing_count_fraction = max_swing_count_fraction.multiply(max_transfer_count_per_cycle)
    }

    const max_swing_count = Math.ceil(max_swing_count_fraction.toDecimal());
    
    return {
        inserter: inserter,
        max_swing_count: max_swing_count,
    }
}