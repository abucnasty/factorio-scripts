import { ConstantCombinatorFilter } from "./filter";

export interface ConstantCombinatorSection {
    index: number,
    filters: ConstantCombinatorFilter[]
}


export class ConstantCombinatorSectionBuilder {
    private section: Partial<ConstantCombinatorSection> = {}

    constructor(index: number) {
        this.section.index = index
        this.section.filters = []
    }

    addFilter(filter: ConstantCombinatorFilter): ConstantCombinatorSectionBuilder {
        this.section.filters!.push(filter)
        return this
    }

    build(): ConstantCombinatorSection {
        return {
            index: this.section.index!,
            filters: this.section.filters!,
        }
    }
}