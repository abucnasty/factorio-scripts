import assert from "assert";
import { AlwaysEnabledControl, EnableControl } from "../../../control-logic";
import { InserterState, EntityState, MachineStatus } from "../../../state";

export type InserterInterceptor = (inserter_state: InserterState, source_state: EntityState, sink_state: EntityState) => EnableControl

const AlwaysEnabledInterceptor: InserterInterceptor = (): EnableControl => {
    return AlwaysEnabledControl
}

const AlwaysDisabledInterceptor: InserterInterceptor = (): EnableControl => {
    return EnableControl.never
}

const WaitUntilSourceIsOutputBlockedInterceptor: InserterInterceptor = (inserter_state, source_state, sink_state): EnableControl => {
    if (EntityState.isMachine(source_state) && EntityState.isMachine(sink_state)) {
        const source_item_name = source_state.machine.output.item_name;
        const sink_input = sink_state.machine.inputs.getOrThrow(source_item_name);

        return EnableControl.latched({
            base: EnableControl.lambda(() => {
                return source_state.status === MachineStatus.OUTPUT_FULL
            }),
            release: EnableControl.never
        })
    }

    return AlwaysEnabledControl
}

export const InserterInterceptor = {
    always_enabled: AlwaysEnabledInterceptor,
    always_disabled: AlwaysDisabledInterceptor,
    wait_until_source_is_output_blocked: WaitUntilSourceIsOutputBlockedInterceptor
}