const fs = require("fs/promises");

const raw_list = new Set([
    "recipe",
    "mining-drill",
    "resource",
])

const item_categories = new Set([
    "item",
    "module",
    "tool",
    "straight-rail",
    "ammo",
    "capsule",
])

async function main() {
    const data = await fs.readFile("./data-raw-dump.json")
    const rawData = JSON.parse(data.toString("utf-8"))

    try {
        const filtered = mapRawDataToFilteredFactorioData(rawData)
        await fs.writeFile("./data-filtered.json", JSON.stringify(filtered, null, 2))
        console.log("Done")
    } catch (err) {
        console.error(err)
    }
}

function mapRawDataToFilteredFactorioData(rawData) {
    const filtered = {}

    for (const category of raw_list) {
        filtered[category] = rawData[category];
    }

    filtered["item"] = {}

    for (const category of item_categories) {
        for (const [itemName, itemData] of Object.entries(rawData[category])) {
            filtered["item"][itemName] = mapAsItem(itemData);
        }
    }
    return filtered;
}

function mapAsItem(struct) {
    return {
        name: struct.name,
        type: "item",
        stack_size: struct.stack_size
    }
}


main()