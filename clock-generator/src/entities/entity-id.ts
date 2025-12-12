import { EntityType } from "./entity-type";

export class EntityId {

    public static forEntity(id: number, type: EntityType): EntityId {
        return new EntityId(`${type}:${id}`, type);
    }

    public static forBelt(id: number): EntityId {
        return this.forEntity(id, EntityType.BELT);
    }

    public static forInserter(id: number): EntityId {
        return this.forEntity(id, EntityType.INSERTER);
    }

    public static forMachine(id: number): EntityId {
        return this.forEntity(id, EntityType.MACHINE);
    }

    public static forDrill(id: number): EntityId {
        return this.forEntity(id, EntityType.DRILL);
    }

    public static isInserter(entityId: EntityId): boolean {
        return entityId.type === EntityType.INSERTER;
    }

    public static isBelt(entityId: EntityId): boolean {
        return entityId.type === EntityType.BELT;
    }

    public static isMachine(entityId: EntityId): boolean {
        return entityId.type === EntityType.MACHINE;
    }

    public static isDrill(entityId: EntityId): boolean {
        return entityId.type === EntityType.DRILL;
    }

    private constructor(
        public readonly id: string,
        public readonly type: EntityType
    ) { }

    compareTo(other: EntityId): number {
        return this.id.localeCompare(other.id);
    }

    valueOf(): string {
        return this.id;
    }

    toString(): string {
        return this.id;
    }
}