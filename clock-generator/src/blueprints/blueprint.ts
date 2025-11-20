import { EntityWithId, Icon } from "./components";

const FACTORIO_VERSION: number = 562949958139904;

export type FactorioBlueprint = {
    item: "blueprint";
    label: string;
    entities: EntityWithId[];
    icons: Icon[];
    wires: number[][];
    /**
     * factorio version
     */
    version: number;
}

export type FactorioBlueprintBook = {
    item: "blueprint-book";
    label: string;
    blueprints: {index: number, blueprint: FactorioBlueprint}[];
    active_index: number;
    description?: string;
    /**
     * factorio version
     */
    version: number;
}

export type FactorioBlueprintFile = {
    blueprint_book?: FactorioBlueprintBook
    blueprint?: FactorioBlueprint
}


export function blueprint(bp: Partial<FactorioBlueprint>): FactorioBlueprint {
    return {
        item: "blueprint",
        label: bp.label || "Blueprint",
        entities: bp.entities || [],
        icons: bp.icons || [],
        wires: bp.wires || [],
        version: FACTORIO_VERSION,
    }
}

export function blueprintBook(bpBook: Partial<FactorioBlueprintBook>): FactorioBlueprintBook {
    return {
        item: "blueprint-book",
        label: bpBook.label || "Blueprint Book",
        blueprints: bpBook.blueprints || [],
        active_index: bpBook.active_index || 0,
        version: FACTORIO_VERSION,
    }
}