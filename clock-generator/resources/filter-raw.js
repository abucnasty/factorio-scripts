const fs = require("fs/promises");

const category_allow_list = new Map([
    ["recipe", identity],
    ["mining-drill", identity],
    ["resource", identity],
    // items
    ["item", mapAsItem],
    ["module", mapAsItem],
    ["tool", mapAsItem],
    ["straight-rail", mapAsItem],
    ["ammo", mapAsItem],
    ["capsule", mapAsItem],
])

function main() {
    fs.readFile("./data-raw-dump.json")
        .then(data => JSON.parse(data.toString("utf-8")))
        .then(rawData => {
            const filtered = {}

            for (const [category, mapFn] of category_allow_list) {
                const category_record = {};
                for (const [key, record] of Object.entries(rawData[category])) {
                    category_record[key] = mapFn(record);
                } 

                filtered[category] = category_record;
                
            }

            return fs.writeFile("./data-filtered.json", JSON.stringify(filtered, null, 2))
        })
        .then(() => console.log("Done"))
        .catch(err => console.error(err))
}

function identity(x) {
    return x;
}

function mapAsItem(struct) {
    return {
        name: struct.name,
        type: "item",
        stack_size: struct.stack_size
    }
}


main()