const fs = require("fs/promises");

const category_allow_list = new Set([
    "item",
    "recipe",
    "tool",
    "mining-drill",
    "resource",
    "module",
    "straight-rail",
    "ammo"
])

fs.readFile("./data-raw-dump.json")
    .then(data => JSON.parse(data.toString("utf-8")))
    .then(rawData => {
        const filtered = {}

        for(const category of category_allow_list) {
            filtered[category] = rawData[category]
        }

        return fs.writeFile("./data-filtered.json", JSON.stringify(filtered, null, 2))
    })
    .then(() => console.log("Done"))
    .catch(err => console.error(err))