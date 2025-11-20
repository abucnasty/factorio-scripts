export interface ControlLogic {
    execute(): void;
    executeForTicks(ticks: number): void;
}