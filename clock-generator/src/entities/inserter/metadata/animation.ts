import assert from "../../../common/assert";
import { InserterAnimationOverrideConfig } from "../../../config";
import { Duration } from "../../../data-types";
import { Belt, BeltSpeed, BeltStackSize } from "../../belt";
import { EntityType } from "../../entity-type";
import { InserterSpec } from "./inserter-spec";

/**
 * Optional belt metadata for calculating dynamic drop duration.
 * When provided for belt sinks, drop duration is calculated based on
 * the belt speed, stack size, and inserter stack size.
 */
export interface BeltDropMetadata {
    belt_speed: BeltSpeed;
    belt_stack_size: BeltStackSize;
    inserter_stack_size: number;
}


export interface InserterAnimationMetadata {
    pickup_duration: Duration;
    drop_duration: Duration;
    rotation_duration: Duration;
}

class InserterAnimationMetadataBuilder {
    private pickup_duration?: Duration;
    private drop_duration?: Duration;
    private rotation_duration?: Duration;

    public setPickupDuration(duration: Duration): InserterAnimationMetadataBuilder {
        this.pickup_duration = duration;
        return this;
    }

    public setDropDuration(duration: Duration): InserterAnimationMetadataBuilder {
        this.drop_duration = duration;
        return this;
    }

    public setRotationDuration(duration: Duration): InserterAnimationMetadataBuilder {
        this.rotation_duration = duration;
        return this;
    }

    public build(): InserterAnimationMetadata {
        assert(
            this.pickup_duration !== undefined,
            "Cannot build InserterAnimationMetadata: missing pickup_duration"
        );
        assert(
            this.drop_duration !== undefined,
            "Cannot build InserterAnimationMetadata: missing drop_duration"
        );
        assert(
            this.rotation_duration !== undefined,
            "Cannot build InserterAnimationMetadata: missing rotation_duration"
        );

        return {
            pickup_duration: this.pickup_duration,
            drop_duration: this.drop_duration,
            rotation_duration: this.rotation_duration
        };
    }
}

function fromSourceAndSink(
    meta: InserterSpec,
    source: EntityType,
    sink: EntityType,
    overrides: InserterAnimationOverrideConfig,
    beltDropMetadata?: BeltDropMetadata
): InserterAnimationMetadata {
    const builder = new InserterAnimationMetadataBuilder();

    if (source === "belt") {
        builder.setPickupDuration(meta.belt.pickup);
    }

    if (source === "machine" || source === "chest") {
        builder.setPickupDuration(meta.machine.pickup);
    }

    if (sink === "belt") {
        if (beltDropMetadata) {
            // Calculate dynamic drop duration based on belt and inserter properties
            const dropDuration = Belt.dropDuration(
                beltDropMetadata.belt_speed,
                beltDropMetadata.belt_stack_size,
                beltDropMetadata.inserter_stack_size
            );
            builder.setDropDuration(dropDuration);
        } else {
            // Fallback to static drop duration from spec
            builder.setDropDuration(meta.belt.drop);
        }
    }

    if (sink === "machine" || sink === "chest") {
        builder.setDropDuration(meta.machine.drop);
    }

    builder.setRotationDuration(meta.rotation);

    if (overrides.pickup_duration_ticks !== undefined) {
        builder.setPickupDuration(Duration.ofTicks(overrides.pickup_duration_ticks));
    }

    return builder.build();
}


export const InserterAnimationMetadata = {
    create: fromSourceAndSink
}