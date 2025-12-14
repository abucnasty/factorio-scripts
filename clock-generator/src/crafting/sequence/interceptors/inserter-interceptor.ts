import assert from "assert";
import { AlwaysEnabledControl, EnableControl } from "../../../control-logic/enable-control";
import { InserterState, EntityState, MachineStatus } from "../../../state";

export type InserterInterceptor = (inserter_state: InserterState, source_state: EntityState, sink_state: EntityState) => EnableControl

const NoopInserterInterceptor: InserterInterceptor = (): EnableControl => {
    return AlwaysEnabledControl
}

const WaitUntilSourceIsOutputBlockedInterceptor: InserterInterceptor = (inserter_state, source_state, sink_state): EnableControl => {
    if (EntityState.isMachine(source_state) && EntityState.isMachine(sink_state)) {
        const source_item_name = source_state.machine.output.item_name;
        const sink_input = sink_state.machine.inputs.get(source_item_name);
        assert(sink_input !== undefined, `Machine ${sink_state.machine.entity_id} does not have an input for item ${source_item_name}`);

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
    noop: NoopInserterInterceptor,
    wait_until_source_is_output_blocked: WaitUntilSourceIsOutputBlockedInterceptor
}