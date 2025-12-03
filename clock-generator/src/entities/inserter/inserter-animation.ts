import { Duration } from "../../data-types";
import { InserterAnimationMetadata } from "./metadata/animation";

export interface InserterAnimation {
    pickup: Duration
    rotation: Duration
    drop: Duration
    total: Duration
}


function animationFromMetadata(
    meta: InserterAnimationMetadata
): InserterAnimation {

    const {
        pickup_duration,
        drop_duration,
        rotation_duration
    } = meta

    return {
        pickup: pickup_duration,
        drop: drop_duration,
        rotation: rotation_duration,
        total: Duration.ofTicks(
            pickup_duration.ticks + drop_duration.ticks + rotation_duration.ticks * 2
        )
    }

}


export const InserterAnimation = {
    fromMetadata: animationFromMetadata
}