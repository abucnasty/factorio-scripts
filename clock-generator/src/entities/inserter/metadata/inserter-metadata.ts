import { QualityIdType } from "../../../blueprints/components";
import { INSERTER_SPECS } from "./inserter-spec";
import { InserterType } from "./inserter-type";
import { InserterTargetEntityType } from "./inserter-target-type";
import { InserterStackSize } from "./stack-size";
import assert from "assert"
import { ItemName } from "../../../data/factorio-data-types";
import { InserterAnimationMetadata } from "./animation";


export interface InserterMetadata {
    animation: InserterAnimationMetadata;
    quality: QualityIdType;
    type: InserterType;
    stack_size: InserterStackSize;
    filters: Set<ItemName>
}

function create(source: InserterTargetEntityType, target: InserterTargetEntityType, stackSize: number, filters: ItemName[]): InserterMetadata {
    
    assert(Object.values<number>(InserterStackSize).includes(stackSize), `Inserter has an invalid stack size of ${stackSize}`)

    // only support legendary for now
    const qualityIdType: QualityIdType = "legendary";
    // only support stack inserter for now
    const inserterType: InserterType = InserterType.STACK_INSERTER;

    const definition = INSERTER_SPECS[inserterType][qualityIdType];

    const animationMetadata = InserterAnimationMetadata.create(
        definition,
        source,
        target
    )

    return {
        animation: animationMetadata,
        quality: qualityIdType,
        type: inserterType,
        stack_size: stackSize as InserterStackSize,
        filters: new Set(filters)
    }
}


export const InserterMetadata = {
    create: create
}