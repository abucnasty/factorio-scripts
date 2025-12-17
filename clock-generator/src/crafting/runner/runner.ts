import { RunnerStep } from "./steps/runner-step";

export interface Runner {
    run_step(step: RunnerStep): void;
    set_debug(enabled: boolean): void;
}