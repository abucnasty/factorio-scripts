import { InserterConfig } from "../../config";
import { ItemName } from "../../data";
import { ReadableBeltRegistry } from "../belt";
import { EntityType } from "../entity-type";
import { ReadableMachineRegistry } from "../machine";
import { InserterMetadata } from "./metadata/inserter-metadata";
import { InserterAnimation } from "./inserter-animation";
import assert from "../../common/assert";
import { assertIsBelt, assertIsMachine, Entity } from "../entity";
import { EntityId } from "../entity-id";
import { EntityRegistry } from "../entity-registry";

export interface InserterTarget {
    item_names: Set<ItemName>;
    entity_id: EntityId;
}


export interface Inserter extends Entity {
    metadata: InserterMetadata;
    sink: InserterTarget;
    source: InserterTarget;
    filtered_items: Set<ItemName>;
    animation: InserterAnimation;
}


export class InserterFactory {
    constructor(
        public readonly entity_registry: EntityRegistry,
    ) { }


    public fromConfig(id: number, config: InserterConfig): Inserter {
        const metadata = InserterMetadata.create(
            config.source.type,
            config.sink.type,
            config.stack_size,
            config.filters ?? [],
            config.overrides ?? {}
        )

        const source = config.source
        const sink = config.sink

        if (sink.type === EntityType.BELT && source.type === EntityType.BELT) {
            throw new Error("Source and sink cannot both be a belt ya silly goose")
        }

        const source_provided_items: Set<ItemName> = new Set()
        const sink_consumed_items: Set<ItemName> = new Set()

        if (source.type === EntityType.BELT) {
            const belt = this.entity_registry.getEntityByIdOrThrow(EntityId.forBelt(source.id));
            assertIsBelt(belt)
            belt.lanes.forEach(lane => {
                source_provided_items.add(lane.ingredient_name)
            })
        }

        if (source.type === EntityType.MACHINE) {
            const machine = this.entity_registry.getEntityByIdOrThrow(EntityId.forMachine(source.id))
            assertIsMachine(machine)
            source_provided_items.add(machine.output.ingredient.name)
        }

        if (sink.type === EntityType.BELT) {
            source_provided_items.forEach(it => sink_consumed_items.add(it))
        }

        if (sink.type === EntityType.MACHINE) {
            const machine = this.entity_registry.getEntityByIdOrThrow(EntityId.forMachine(sink.id))
            assertIsMachine(machine)
            machine.inputs.forEach((input) => {
                sink_consumed_items.add(input.ingredient.name)
            })
        }


        let filtered_items = new Set(Array.from(sink_consumed_items).filter(it => source_provided_items.has(it)))

        if(config.filters && config.filters.length > 0) {
            config.filters.forEach(it => {
                assert(sink_consumed_items.has(it), `Inserter filter ${it} is not a valid item for sink entity ${sink.id} of type ${sink.type}`);
            })
            filtered_items = new Set(config.filters);
        }

        return {
            entity_id: EntityId.forInserter(id),
            metadata: metadata,
            source: {
                entity_id: EntityId.forEntity(source.id, source.type),
                item_names: source_provided_items
            },
            sink: {
                entity_id: EntityId.forEntity(sink.id, sink.type),
                item_names: sink_consumed_items
            },
            filtered_items,
            animation: InserterAnimation.fromMetadata(metadata.animation)
        }
    }
}