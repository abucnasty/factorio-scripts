import { CompositeControlLogic } from "../../control-logic/composite-control-logic";
import { TickControlLogic } from "../../control-logic/tick-control-logic";
import { Duration } from "../../data-types";
import { EntityId } from "../../entities";
import { MachineStatus } from "../../state";
import { SimulationContext } from "./simulation-context";

export function simulateFromContext(context: SimulationContext, duration: Duration): void {

    const tick_control_logic = new TickControlLogic(context.tick_provider);

    const control_logic = new CompositeControlLogic(
        [
            tick_control_logic,
            ...context.machines,
            ...context.drills,
            ...context.inserters
        ]
    )

    const start_tick = context.tick_provider.getCurrentTick();
    const end_tick = start_tick + duration.ticks;

    while (true) {
        const current_tick = context.tick_provider.getCurrentTick();
        if (current_tick >= end_tick) {
            break;
        }
        control_logic.executeForTick();
    }
}

export function simulateUntilAllMachinesAreOutputBlocked(
    context: SimulationContext
): void {
    const tick_control_logic = new TickControlLogic(context.tick_provider);

    const input_inserters_only = context.inserters
        .filter(it => EntityId.isMachine(it.inserter_state.inserter.sink.entity_id))


    const control_logic = new CompositeControlLogic(
        [
            tick_control_logic,
            ...context.machines,
            ...context.drills,
            ...input_inserters_only,
        ]
    )

    while (true) {
        control_logic.executeForTick();
        if (context.machines.some(it => it.machine_state.status !== MachineStatus.OUTPUT_FULL)) {
            continue;
        }
        break;
    }
}