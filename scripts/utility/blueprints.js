import zlib from "zlib";

const FACTORIO_VERSION = 562949958139904;


/**
 * Encode JSON to Factorio blueprint string
 */
export function encodeBlueprintJSON(json) {
    // stringify JSON
    const jsonString = JSON.stringify(json);

    // compress with zlib
    const deflated = zlib.deflateSync(Buffer.from(jsonString, "utf-8"));

    // base64 encode
    const base64 = deflated.toString("base64");

    // prepend '0' (Factorio version header)
    return "0" + base64;
}


export function createBlueprintBook(label, blueprints) {
    return {
        blueprint_book: {
            blueprints: blueprints.map((bp, index) => ({
                ...bp,
                index: index
            })),
            item: "blueprint-book",
            label: label,
            active_index: 0,
            version: FACTORIO_VERSION
        }
    }
}

/**
 * 
 * @param {string} label 
 * @param {{name: string}} iconSignal 
 * @param {any[]} entities 
 * @param {number[][]} wires 
 * @returns 
 */
export function createBlueprint(label, iconSignal, entities = [], wires = []) {
    return {
        blueprint: {
            icons: [
                {
                    "signal": iconSignal,
                    "index": 1
                }
            ],
            entities: entities.map((entity, index) => assignEntityNumber(entity, index + 1)),
            wires: wires,
            item: "blueprint",
            label: label,
            version: FACTORIO_VERSION
        }
    }
}

/**
 * 
 * @param {string} itemName 
 * @returns 
 */
export function createItemSignal(itemName) {
    return {
        "name": itemName
    }
}


function assignEntityNumber(blueprint, entityNumber) {
    return {
        ...blueprint,
        entity_number: entityNumber,
    }
}
