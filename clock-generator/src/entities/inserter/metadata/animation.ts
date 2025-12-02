import { InserterAnimationOverrideConfig } from "../../../config/config";
import { Duration } from "../../../data-types";
import { InserterSpec } from "./inserter-spec";
import { InserterTargetEntityType } from "./inserter-target-type";


export interface InserterAnimationMetadata {
    pickup_duration: Duration;
    drop_duration: Duration;
    rotation_duration: Duration;
}

function fromSourceAndTarget(
    meta: InserterSpec,
    source: InserterTargetEntityType,
    target: InserterTargetEntityType,
    overrides: InserterAnimationOverrideConfig
): InserterAnimationMetadata {
    const animationMetadata: Partial<InserterAnimationMetadata> = {}

    if (source === "belt") {
        animationMetadata.pickup_duration = meta.belt.pickup;
    }

    if (source === "machine") {
        animationMetadata.pickup_duration = meta.machine.pickup;
    }

    if (target === "belt") {
        animationMetadata.drop_duration = meta.belt.drop;
    }

    if (target === "machine") {
        animationMetadata.drop_duration = meta.machine.drop;
    }

    animationMetadata.rotation_duration = meta.rotation;

    if (overrides.pickup_duration_ticks !== undefined) {
        animationMetadata.pickup_duration = Duration.ofTicks(overrides.pickup_duration_ticks);
    }

    return animationMetadata as InserterAnimationMetadata;
}


export const InserterAnimationMetadata = {
    create: fromSourceAndTarget
}