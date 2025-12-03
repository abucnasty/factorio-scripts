import { EntityId } from "../../entities";
import { EntityState, MachineState, ReadableEntityStateRegistry } from "../../state";
import { ModePlugin, ModeStateMachine, ModeTransitionEvaluator } from "../mode";
import { MachineIngredientShortageMode, MachineMode, MachineOutputFullMode, MachineWorkingMode } from "./modes";
import { CraftEventListener, CraftEventListenerPlugin, MachineStatusPlugin } from "./plugins";
import { IngredientShortageModeTransitionEvaluator } from "./transitions/ingredient-shortage-mode-evaluator";
import { OutputFullModeTransitionEvaluator } from "./transitions/output-full-mode-evaluator";
import { WorkingModeTransitionEvaluator } from "./transitions/working-mode-evaluator";

export class MachineStateMachine extends ModeStateMachine<MachineMode> {

    public static create = create;
    public static forMachineId = createFromId;

    constructor(
        public readonly machine_state: MachineState,
        initialMode: MachineMode,
        graph: Map<MachineMode, ModeTransitionEvaluator<MachineMode>>,
        plugins: ModePlugin<MachineMode>[] = [],
    ) {
        super(initialMode, graph, plugins);
    }

    addCraftEventPlugin(onCraftEvent: CraftEventListener): void {
        this.addPlugin(new CraftEventListenerPlugin(this.machine_state, onCraftEvent));
    }
}


function create(args: {
    machine_state: MachineState,
    plugins?: ModePlugin<MachineMode>[],
}): MachineStateMachine {


    const { machine_state, plugins = [] } = args;

    const working_mode = new MachineWorkingMode(machine_state);
    const ingredient_shortage_mode = new MachineIngredientShortageMode();
    const output_full_mode = new MachineOutputFullMode();

    const graph = new Map<MachineMode, ModeTransitionEvaluator<MachineMode>>([
        [working_mode, new WorkingModeTransitionEvaluator(
            ingredient_shortage_mode,
            output_full_mode,
            working_mode,
        )],
        [ingredient_shortage_mode, new IngredientShortageModeTransitionEvaluator(
            machine_state,
            working_mode,
        )],
        [output_full_mode, new OutputFullModeTransitionEvaluator(
            machine_state,
            working_mode,
        )],
    ]);

    const initial_mode = ingredient_shortage_mode;

    return new MachineStateMachine(
        args.machine_state,
        initial_mode,
        graph,
        plugins.concat(new MachineStatusPlugin(machine_state)),
    );
}


function createFromId(machine_entity_id: EntityId, entity_state_registry: ReadableEntityStateRegistry): MachineStateMachine {
    const machine_state = entity_state_registry.getStateByEntityIdOrThrow(machine_entity_id);
    if(!EntityState.isMachine(machine_state)) {
        throw new Error(`Entity with id ${machine_entity_id} is not a MachineState`);
    }
    return MachineStateMachine.create({
        machine_state: machine_state,
    });
}

