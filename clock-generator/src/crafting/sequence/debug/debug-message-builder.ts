import { Entity } from "../../../entities";

export class DebugMessageBuilder {
    private readonly parts: string[] = [];
    private delimiter: string = '\t';

    public setDelimiter(delimiter: string): DebugMessageBuilder {
        this.delimiter = delimiter;
        return this;
    }

    public append(part: string): DebugMessageBuilder {
        this.parts.push(part);
        return this;
    }

    public appendEntity(entity: Entity): DebugMessageBuilder {

        if (Entity.isMachine(entity)) {
            const recipe = entity.metadata.recipe.name
            this.parts.push(`(${entity.entity_id.id})<${recipe}>`);
            return this;
        }

        if (Entity.isInserter(entity)) {
            const type = entity.metadata.type;
            this.parts.push(`(${entity.entity_id.id})<${type}>`);
            return this;
        }

        this.parts.push(`(${entity.entity_id.id})`);
        return this;
    }

    public prependTick(tick: number): DebugMessageBuilder {
        const tickPadded = tick.toString().padStart(4, '0');
        this.parts.unshift(`Tick(${tickPadded})`);
        return this;
    }

    public appendRelativeTick(tick: number): DebugMessageBuilder {
        const tickPadded = tick.toString().padStart(4, '0');
        this.parts.push(`RelativeTick(${tickPadded})`);
        return this;
    }

    public build(): string {
        return this.parts.join(this.delimiter);
    }
}