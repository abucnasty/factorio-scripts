import { describe, test, expect, vi, beforeEach } from "vitest"
import { mock } from 'vitest-mock-extended';
import { IdleModeTransitionEvaluator } from "./idle-mode-transition-evaluator"
import { BeltState, EntityState, InserterState, MachineState } from "../../../state"
import { EntityId, Inserter, InserterMetadata, InserterStackSize, InserterTarget, Machine, MachineMetadata, MachineType, RecipeMetadata } from "../../../entities"
import { ItemName } from "../../../data/factorio-data-types"
import { InserterAnimation } from "../../../entities/inserter/inserter-animation"
import { InserterAnimationOverrideConfig } from "../../../config/config"
import { InserterPickupMode } from "../modes"
import { ModeTransition } from "../../mode";
import { AlwaysEnabledControl } from "../../enable-control";


describe("transitions (belt to machine)", () => {

    interface TestContext {
        inserterState: InserterState,
        sourceState: EntityState,
        sinkState: EntityState,
    }

    const createMachine = (recipeName: string, metadata: Partial<MachineMetadata> = {}): Machine => {
        const id = -1;
        return Machine.createMachine(id, {
            crafting_speed: 1,
            productivity: 0,
            recipe: RecipeMetadata.fromRecipeName(recipeName),
            ...metadata,
            type: metadata.type ?? MachineType.MACHINE,
        })
    }

    const createInserter = (args: {
        source: InserterTarget,
        sink: InserterTarget,
        stack_size?: InserterStackSize,
        filters?: ItemName[]
    }): Inserter => {
        const {
            source,
            sink,
            stack_size = InserterStackSize.SIZE_16,
            filters = []
        } = args;

        const overrides: InserterAnimationOverrideConfig = {}
        const metadata = InserterMetadata.create(
            source.entity_id.type,
            sink.entity_id.type,
            stack_size,
            filters,
            overrides
        )
        return {
            entity_id: EntityId.forInserter(-1),
            metadata: metadata,
            animation: InserterAnimation.fromMetadata(metadata.animation),
            source: source,
            sink: sink,
            filtered_items: new Set(filters),
        }
    }

    const createTestContext = (): TestContext => {
        const mockSource: BeltState = mock<BeltState>({
            entity_id: EntityId.forBelt(-1),
        });

        const mockSink: MachineState = MachineState.forMachine(
            createMachine("iron-gear-wheel")
        )
        return {
            sourceState: mockSource,
            sinkState: mockSink,
            inserterState: InserterState.createIdle(createInserter({
                source: {
                    entity_id: mockSource.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                sink: {
                    entity_id: mockSink.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                filters: ["iron-plate"]
            }))
        }
    }

    describe("IdleModeTransition", () => {

        test("transitions to PICKUP when able to pickup", () => {
            const testContext = createTestContext();

            const pickup_mode = mock<InserterPickupMode>();

            const evaluator = IdleModeTransitionEvaluator.create({
                inserter_state: testContext.inserterState,
                source_state: testContext.sourceState,
                sink_state: testContext.sinkState,
                pickup_mode: pickup_mode,
                disabled_mode: mock(),
                tick_provider: mock(),
                enable_control: AlwaysEnabledControl,
            });

            const nextMode = evaluator.evaluateTransition();

            expect(nextMode).not.toBe(ModeTransition.NONE)
            expect(nextMode?.toMode).toBe(pickup_mode);
        })

        test("remains in IDLE when inputs are over the automated insertion limit of the machine", () => {
            const testContext = createTestContext();

            const pickup_mode = mock<InserterPickupMode>();
            const evaluator = IdleModeTransitionEvaluator.create({
                inserter_state: testContext.inserterState,
                source_state: testContext.sourceState,
                sink_state: testContext.sinkState,
                pickup_mode: pickup_mode,
                disabled_mode: mock(),
                tick_provider: mock(),
                enable_control: AlwaysEnabledControl,
            });

            const machineState = testContext.sinkState as MachineState;
            const automated_insertion_limit = machineState.machine.inputs.get("iron-plate")!.automated_insertion_limit;
            machineState.inventoryState.setQuantity("iron-plate", automated_insertion_limit.quantity);


            const nextMode = evaluator.evaluateTransition();
            expect(nextMode).toBe(ModeTransition.NONE)
        })

        test("remains in IDLE when target machine is output blocked", () => {
            const testContext = createTestContext();

            const pickup_mode = mock<InserterPickupMode>();
            const evaluator = IdleModeTransitionEvaluator.create({
                inserter_state: testContext.inserterState,
                source_state: testContext.sourceState,
                sink_state: testContext.sinkState,
                pickup_mode: pickup_mode,
                disabled_mode: mock(),
                tick_provider: mock(),
                enable_control: AlwaysEnabledControl
            });

            const machineState = testContext.sinkState as MachineState;
            const output_block_quantity = machineState.machine.output.outputBlock.quantity;
            machineState.inventoryState.setQuantity("iron-gear-wheel", output_block_quantity);

            const nextMode = evaluator.evaluateTransition();
            expect(nextMode).toBe(ModeTransition.NONE)
        })
    })

    describe("InserterPickupMode (belt to machine)", () => {

        test("stops picking up from belt once stack size is reached", () => {
            const mockSource: BeltState = mock<BeltState>({
                entity_id: EntityId.forBelt(-1),
                belt: {
                    lanes: [
                        { ingredient_name: "iron-plate", stack_size: 4 }
                    ]
                }
            });

            const mockSink: MachineState = MachineState.forMachine(
                createMachine("iron-gear-wheel")
            );

            const stack_size = InserterStackSize.SIZE_12;
            const inserterState = InserterState.createIdle(createInserter({
                source: {
                    entity_id: mockSource.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                sink: {
                    entity_id: mockSink.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                stack_size: stack_size,
                filters: ["iron-plate"]
            }));

            const pickup_mode = InserterPickupMode.create({
                inserterState: inserterState,
                sourceState: mockSource,
                sinkState: mockSink,
            });

            // First pickup: 0 + 4 = 4
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(4);

            // Second pickup: 4 + 4 = 8
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(8);

            // Third pickup: 8 + 4 = 12 (should reach stack size)
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(12);

            // Fourth pickup: should not exceed stack size of 12
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(12);
            expect(inserterState.held_item?.quantity).toBeLessThanOrEqual(stack_size);
        })

        test("caps pickup quantity when remaining capacity is less than lane stack size", () => {
            const mockSource: BeltState = mock<BeltState>({
                entity_id: EntityId.forBelt(-1),
                belt: {
                    lanes: [
                        { ingredient_name: "iron-plate", stack_size: 4 }
                    ]
                }
            });

            const mockSink: MachineState = MachineState.forMachine(
                createMachine("iron-gear-wheel")
            );

            const stack_size = InserterStackSize.SIZE_10;
            const inserterState = InserterState.createIdle(createInserter({
                source: {
                    entity_id: mockSource.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                sink: {
                    entity_id: mockSink.entity_id,
                    item_names: new Set(["iron-plate"])
                },
                stack_size: stack_size,
                filters: ["iron-plate"]
            }));

            const pickup_mode = InserterPickupMode.create({
                inserterState: inserterState,
                sourceState: mockSource,
                sinkState: mockSink,
            });

            // First pickup
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(4);

            // Second pickup
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(8);

            // Third pickup
            pickup_mode.executeForTick();
            expect(inserterState.held_item?.quantity).toBe(10);
            expect(inserterState.held_item?.quantity).toBeLessThanOrEqual(stack_size);
        })
    })
})