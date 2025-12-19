import { CompositeControlLogic } from "../../../control-logic/composite-control-logic";
import { ControlLogic } from "../../../control-logic/control-logic";
import { EnableControl } from "../../../control-logic/enable-control";
import { TickControlLogic } from "../../../control-logic/tick-control-logic";
import { EntityId } from "../../../entities";
import { MachineStatus } from "../../../state";
import { cloneSimulationContextWithInterceptors, SimulationContext } from "../../sequence";
import { InserterInterceptor } from "../../sequence/interceptors/inserter-interceptor";
import { RunnerStep, RunnerStepType } from "./runner-step";

/**
 * PrepareStep simulates the crafting process until all machines are output blocked.
 * This ensures that the system is in a steady state before further simulation steps.
 */
export class PrepareStep implements RunnerStep {
    public readonly type: RunnerStepType = RunnerStepType.PREPARE
    private readonly control_logic: ControlLogic;

    constructor(
        private readonly simulation_context: SimulationContext,
    ) {
        this.control_logic = this.build()
    }

    public execute(): void {
        console.log("Executing Prepare Step");
        const control_logic = this.control_logic;
        const context = this.simulation_context;
        while (true) {
            control_logic.executeForTick();
            if (context.tick_provider.getCurrentTick() > 1_000_000) {
                const machines_not_output_full = context.machines.filter(it => it.machine_state.status !== MachineStatus.OUTPUT_FULL)
                machines_not_output_full.forEach(it => {
                    console.error(`Machine ${it.machine_state.machine.entity_id} status: ${it.machine_state.status}`);
                    it.machine_state.machine.inputs.forEach(input => {
                        if (it.machine_state.inventoryState.getItemOrThrow(input.item_name).quantity < 1) {
                            console.error(`  Missing input: ${input.item_name}`);
                        }
                    })
                })
                throw new Error("Simulation exceeded 1,000,000 ticks without reaching output blocked state");
            }
            if (context.machines.some(it => it.machine_state.status !== MachineStatus.OUTPUT_FULL)) {
                continue;
            }

            break;
        }
    }

    private build(): ControlLogic {
        const context = this.simulation_context
        const tick_control_logic = new TickControlLogic(context.tick_provider);
        const input_inserters_only = context.inserters
            .filter(it => EntityId.isMachine(it.inserter_state.inserter.sink.entity_id))

        const input_inserter_ids = new Set(
            input_inserters_only.map(it => it.inserter_state.inserter.entity_id.id)
        )

        const cloned_context = cloneSimulationContextWithInterceptors(context, {
            inserter: (inserter_state, source_state, sink_state) => {
                if (input_inserter_ids.has(inserter_state.inserter.entity_id.id)) {
                    return InserterInterceptor.wait_until_source_is_output_blocked(inserter_state, source_state, sink_state);
                }
                return EnableControl.never
            }
        });

        return new CompositeControlLogic(
            [
                tick_control_logic,
                ...cloned_context.machines,
                ...cloned_context.drills,
                ...cloned_context.inserters,
            ]
        )
    }
}