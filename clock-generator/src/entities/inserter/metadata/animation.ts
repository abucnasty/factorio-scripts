import { InserterAnimationOverrideConfig } from "../../../config";
import { Duration } from "../../../data-types";
import { EntityType } from "../../entity-type";
import { InserterSpec } from "./inserter-spec";


export interface InserterAnimationMetadata {
    pickup_duration: Duration;
    drop_duration: Duration;
    rotation_duration: Duration;
}

function fromSourceAndSink(
    meta: InserterSpec,
    source: EntityType,
    sink: EntityType,
    overrides: InserterAnimationOverrideConfig
): InserterAnimationMetadata {
    const animationMetadata: Partial<InserterAnimationMetadata> = {}

    if (source === "belt") {
        animationMetadata.pickup_duration = meta.belt.pickup;
    }

    if (source === "machine" || source === "chest") {
        animationMetadata.pickup_duration = meta.machine.pickup;
    }

    if (sink === "belt") {
        animationMetadata.drop_duration = meta.belt.drop;
    }

    if (sink === "machine" || sink === "chest") {
        animationMetadata.drop_duration = meta.machine.drop;
    }

    animationMetadata.rotation_duration = meta.rotation;

    if (overrides.pickup_duration_ticks !== undefined) {
        animationMetadata.pickup_duration = Duration.ofTicks(overrides.pickup_duration_ticks);
    }

    return animationMetadata as InserterAnimationMetadata;
}


export const InserterAnimationMetadata = {
    create: fromSourceAndSink
}