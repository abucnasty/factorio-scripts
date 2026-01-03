-- Clock Generator Sidecar - Data Stage
-- Defines the selection tool prototype for selecting machines

data:extend({
    -- Selection tool for extracting crafting speeds
    {
        type = "selection-tool",
        name = "crafting-speed-analyzer",
        icon = "__base__/graphics/icons/blueprint.png",
        icon_size = 64,
        subgroup = "tool",
        order = "c[automated-construction]-d[crafting-speed-analyzer]",
        stack_size = 1,
        select = {
            border_color = { r = 0, g = 1, b = 0.5 },
            cursor_box_type = "copy",
            mode = { "buildable-type", "same-force" },
            entity_type_filters = { "assembling-machine", "furnace", "mining-drill", "lab", "inserter", "transport-belt", "underground-belt", "splitter" }
        },
        alt_select = {
            border_color = { r = 1, g = 0.5, b = 0 },
            cursor_box_type = "copy",
            mode = { "buildable-type", "same-force" },
            entity_type_filters = { "assembling-machine", "furnace", "mining-drill", "lab", "inserter", "transport-belt", "underground-belt", "splitter" }
        },
        flags = { "only-in-cursor", "spawnable" }
    },

    -- Shortcut button for quick access
    {
        type = "shortcut",
        name = "crafting-speed-analyzer-shortcut",
        action = "spawn-item",
        item_to_spawn = "crafting-speed-analyzer",
        icon = "__base__/graphics/icons/blueprint.png",
        icon_size = 64,
        small_icon = "__base__/graphics/icons/blueprint.png",
        small_icon_size = 64,
        associated_control_input = "crafting-speed-analyzer-toggle"
    },

    -- Custom input for keyboard shortcut
    {
        type = "custom-input",
        name = "crafting-speed-analyzer-toggle",
        key_sequence = "ALT + E",
        action = "spawn-item",
        item_to_spawn = "crafting-speed-analyzer"
    }
})
