export const RunnerStepType = {
    PREPARE: "prepare",
    WARM_UP: "warm_up",
    SIMULATE: "simulate",
} as const

export type RunnerStepType = typeof RunnerStepType[keyof typeof RunnerStepType];

export interface RunnerStep {
    readonly type: RunnerStepType;
    execute(): void;
}