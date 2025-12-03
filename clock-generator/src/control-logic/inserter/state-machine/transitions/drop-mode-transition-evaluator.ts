import { Duration } from "../../../../data-types";
import { InserterAnimation } from "../../../../entities/inserter/inserter-animation";
import { TickProvider } from "../../../current-tick-provider";
import { ModeTransition, ModeTransitionEvaluator } from "../../../mode";
import { InserterMode } from "../modes";
import { InserterSwingMode } from "../modes/swing-mode";

export class DropModeTransitionEvaluator implements ModeTransitionEvaluator<InserterMode> {

    constructor(
        private readonly inserter_animation: InserterAnimation,
        private readonly swing_mode: InserterSwingMode,
        private readonly tick_provider: TickProvider
    ) { }

    public entered_tick: number = 0;

    public onEnter(fromMode: InserterMode): void {
        this.entered_tick = this.tick_provider.getCurrentTick();
    }

    public onExit(toMode: InserterMode): void { }

    public evaluateTransition(): ModeTransition<InserterMode> {
        if (this.elapsedDuration().ticks < this.inserter_animation.drop.ticks) {
            return ModeTransition.NONE;
        }
        return ModeTransition.transition(this.swing_mode, "drop duration completed");
    }

    public elapsedDuration(): Duration {
        const current_tick = this.tick_provider.getCurrentTick();
        if (this.entered_tick === null) {
            throw new Error("Cannot get elapsed duration, evaluator has not entered a mode yet");
        }
        const ticks_elapsed = current_tick - this.entered_tick;
        return Duration.ofTicks(ticks_elapsed);
    }
}