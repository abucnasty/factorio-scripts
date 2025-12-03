import { Mode } from "./mode";

export interface ModeProvider<M extends Mode> {
    readonly current_mode: M;
    readonly modes: ReadonlySet<M>;
}