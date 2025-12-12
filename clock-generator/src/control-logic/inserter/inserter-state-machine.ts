import assert from "assert"
import { ModePlugin, ModeStateMachine, ModeTransitionEvaluator } from "../mode";
import { InserterDropMode, InserterIdleMode, InserterMode, InserterPickupMode, InserterSwingMode } from "./modes";
import { EntityId } from "../../entities";
import { EntityState, InserterState, ReadableEntityStateRegistry } from "../../state";
import { TickProvider } from "../current-tick-provider";
import { EnableControl } from "../enable-control";
import { InserterDisabledMode } from "./modes/disabled-mode";
import { InserterStatusPlugin } from "./plugins";
import { IdleModeTransitionEvaluator, InserterSwingModeTransitionEvaluator, DropModeTransitionEvaluator, PickupModeTransitionEvaluator, DisabledModeTransitionEvaluator } from "./transitions";

export class InserterStateMachine extends ModeStateMachine<InserterMode> {
    public entity_id: EntityId;

    public static create = createInserterStateMachine;
    public static forInserterId = createFromId;

    constructor(
        initialMode: InserterMode,
        transitionGraph: Map<InserterMode, ModeTransitionEvaluator<InserterMode>>,
        plugins: ModePlugin<InserterMode>[] = [],
        public readonly inserter_state: InserterState,
    ) {
        super(initialMode, transitionGraph, plugins);
        this.entity_id = inserter_state.entity_id;
    }
};

function createInserterStateMachine(args: {
    inserter_state: InserterState,
    source_state: EntityState,
    sink_state: EntityState,
    tick_provider: TickProvider,
    enable_control: EnableControl,
    plugins?: ModePlugin<InserterMode>[]
}): InserterStateMachine {
    const {
        inserter_state: inserter_state,
        source_state,
        sink_state,
        tick_provider,
        enable_control,
        plugins = []
    } = args;

    const idle_mode = new InserterIdleMode();
    const pickup_mode = InserterPickupMode.create({
        inserterState: inserter_state,
        sourceState: source_state,
        sinkState: sink_state,
    })
    const swing_mode = new InserterSwingMode();
    const drop_mode = new InserterDropMode(inserter_state, sink_state);
    const disabled_mode = new InserterDisabledMode();

    const idle_mode_evaluator = IdleModeTransitionEvaluator.create({
        inserter_state: inserter_state,
        source_state: source_state,
        sink_state: sink_state,
        enable_control: enable_control,
        disabled_mode: disabled_mode,
        tick_provider: tick_provider,
        pickup_mode: pickup_mode,
    })

    const swing_mode_evaluator = InserterSwingModeTransitionEvaluator.create({
        inserter_animation: inserter_state.inserter.animation,
        drop_mode: drop_mode,
        idle_mode: idle_mode,
        tick_provider: tick_provider,
        idle_mode_transition_evaluator: idle_mode_evaluator,
    })

    const drop_mode_evaluator = new DropModeTransitionEvaluator(
        inserter_state.inserter.animation,
        swing_mode,
        tick_provider
    );

    const pickup_mode_evaluator = new PickupModeTransitionEvaluator(
        inserter_state,
        swing_mode,
        disabled_mode,
        enable_control,
    );

    const disabled_mode_evaluator = new DisabledModeTransitionEvaluator(
        enable_control,
        idle_mode,
    );

    const graph = new Map<InserterMode, ModeTransitionEvaluator<InserterMode>>([
        [idle_mode,     idle_mode_evaluator],
        [swing_mode,    swing_mode_evaluator],
        [drop_mode,     drop_mode_evaluator],
        [pickup_mode,   pickup_mode_evaluator],
        [disabled_mode, disabled_mode_evaluator],
    ]);

    const initial_mode = idle_mode;

    const inserter_status_plugin = new InserterStatusPlugin(inserter_state);

    return new InserterStateMachine(
        initial_mode,
        graph,
        [inserter_status_plugin, ...plugins],
        inserter_state,
    );
}

function createFromId(args: {
    entity_id: EntityId,
    entity_state_registry: ReadableEntityStateRegistry,
    tick_provider: TickProvider,
    enable_control: EnableControl,
}): InserterStateMachine {
    const {
        entity_id,
        entity_state_registry,
        tick_provider,
        enable_control
    } = args;
    const inserter_state = entity_state_registry.getStateByEntityIdOrThrow(entity_id);
    assert(EntityState.isInserter(inserter_state), `Entity with ID ${entity_id} is not an inserter`);

    const source_state = entity_state_registry.getStateByEntityIdOrThrow(inserter_state.inserter.source.entity_id);
    const sink_state = entity_state_registry.getStateByEntityIdOrThrow(inserter_state.inserter.sink.entity_id);


    return createInserterStateMachine({
        inserter_state: inserter_state,
        source_state: source_state,
        sink_state: sink_state,
        tick_provider: tick_provider,
        enable_control: enable_control,
    })

}
