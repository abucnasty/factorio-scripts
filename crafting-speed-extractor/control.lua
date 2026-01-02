-- Crafting Speed Extractor - Control Stage
-- Runtime logic for selecting machines and extracting crafting data

-- ============================================================================
-- Global State Management
-- ============================================================================

---@class MachineData
---@field name string Machine entity name
---@field recipe string Recipe name
---@field crafting_speed number Effective crafting speed with bonuses
---@field productivity number Productivity bonus as percentage (0-100+)
---@field type "machine"|"furnace" Entity type category

---@class PlayerData
---@field machines MachineData[] Extracted machine data
---@field gui LuaGuiElement? Reference to the GUI frame

---@type table<uint, PlayerData>
storage = storage or {}

local function init_player_data(player_index)
    storage[player_index] = storage[player_index] or {
        machines = {},
        gui = nil
    }
end

-- ============================================================================
-- Machine Data Extraction
-- ============================================================================

---Extract crafting data from a single entity
---@param entity LuaEntity
---@return MachineData|nil
local function extract_machine_data(entity)
    if not entity or not entity.valid then
        return nil
    end

    -- Get recipe (skip entities without active recipe)
    local recipe, quality = entity.get_recipe()
    if not recipe then
        return nil
    end

    -- Determine type category
    local entity_type = "machine"
    if entity.type == "furnace" then
        entity_type = "furnace"
    end

    -- Debug: Log all productivity-related values
    local entity_prod_bonus = entity.productivity_bonus or 0
    
    -- Get research productivity from the force's recipe
    local research_prod = 0
    if entity.force and recipe then
        local force_recipe = entity.force.recipes[recipe.name]
        if force_recipe then
            research_prod = force_recipe.productivity_bonus or 0
        end
    end

    -- Combine entity productivity (modules/beacons) with research productivity
    local total_productivity = entity_prod_bonus + research_prod
    
    -- Cap productivity at 300% (Factorio maximum)
    if total_productivity > 3.0 then
        total_productivity = 3.0
    end

    -- Extract data
    ---@type MachineData
    local data = {
        name = entity.name,
        recipe = recipe.name,
        crafting_speed = entity.crafting_speed,
        productivity = total_productivity * 100,
        type = entity_type
    }

    return data
end

---Extract data from all selected entities
---@param entities LuaEntity[]
---@return MachineData[]
local function extract_all_machines(entities)
    local machines = {}
    
    for _, entity in pairs(entities) do
        local data = extract_machine_data(entity)
        if data then
            table.insert(machines, data)
        end
    end

    return machines
end

-- ============================================================================
-- JSON Export
-- ============================================================================

---Convert machine data to clock-generator compatible JSON
---@param machines MachineData[]
---@return string
local function machines_to_json(machines)
    local export = {}
    
    for i, machine in ipairs(machines) do
        table.insert(export, {
            id = i,
            recipe = machine.recipe,
            crafting_speed = machine.crafting_speed,
            productivity = machine.productivity,
            type = machine.type
        })
    end

    return helpers.table_to_json(export)
end

-- ============================================================================
-- GUI Management
-- ============================================================================

local GUI_NAME = "crafting_speed_extractor_frame"
local COPY_GUI_NAME = "crafting_speed_extractor_copy_frame"

---Destroy the main results GUI for a player (not the copy popup)
---@param player LuaPlayer
local function destroy_gui(player)
    local frame = player.gui.screen[GUI_NAME]
    if frame and frame.valid then
        frame.destroy()
    end
    if storage[player.index] then
        storage[player.index].gui = nil
    end
end

---Destroy all GUIs for a player (including copy popup)
---@param player LuaPlayer
local function destroy_all_gui(player)
    destroy_gui(player)
    local copy_frame = player.gui.screen[COPY_GUI_NAME]
    if copy_frame and copy_frame.valid then
        copy_frame.destroy()
    end
end

---Create the copy/paste popup with selectable JSON text
---@param player LuaPlayer
---@param json string
local function create_copy_popup(player, json)
    -- Remove any existing copy popup
    local existing = player.gui.screen[COPY_GUI_NAME]
    if existing and existing.valid then
        existing.destroy()
    end

    -- Create popup frame
    local frame = player.gui.screen.add({
        type = "frame",
        name = COPY_GUI_NAME,
        direction = "vertical",
        caption = { "crafting-speed-extractor.copy-popup-title" }
    })
    frame.auto_center = true

    -- Instructions
    frame.add({
        type = "label",
        caption = { "crafting-speed-extractor.copy-instructions" }
    })

    -- Text box with JSON (user can select all and copy)
    local textbox = frame.add({
        type = "text-box",
        name = "crafting_speed_extractor_json_text",
        text = json
    })
    textbox.style.width = 600
    textbox.style.height = 300
    textbox.read_only = true
    textbox.word_wrap = true
    -- Select all text automatically
    textbox.select_all()
    textbox.focus()

    -- Button flow
    local button_flow = frame.add({
        type = "flow",
        direction = "horizontal"
    })
    button_flow.style.horizontal_spacing = 8
    button_flow.style.top_margin = 8
    button_flow.style.horizontally_stretchable = true
    button_flow.style.horizontal_align = "right"

    button_flow.add({
        type = "button",
        name = "crafting_speed_extractor_copy_close",
        caption = { "crafting-speed-extractor.close-button" }
    })

    -- Don't set player.opened here - it would close the main GUI and trigger destroy_gui
    -- The popup will stay open alongside the main GUI
end

---Create the extraction results GUI
---@param player LuaPlayer
---@param machines MachineData[]
local function create_gui(player, machines)
    -- Remove existing GUI
    destroy_gui(player)

    -- Main frame
    local frame = player.gui.screen.add({
        type = "frame",
        name = GUI_NAME,
        direction = "vertical",
        caption = { "crafting-speed-extractor.gui-title" }
    })
    frame.auto_center = true

    -- Store reference
    storage[player.index].gui = frame

    -- Header flow with machine count
    local header = frame.add({
        type = "flow",
        direction = "horizontal"
    })
    header.style.horizontal_spacing = 8
    header.style.bottom_margin = 8

    header.add({
        type = "label",
        caption = { "crafting-speed-extractor.machine-count", #machines },
        style = "heading_2_label"
    })

    -- Content frame
    local content_frame = frame.add({
        type = "frame",
        direction = "vertical",
        style = "inside_shallow_frame_with_padding"
    })
    content_frame.style.minimal_width = 500
    content_frame.style.maximal_height = 400

    if #machines == 0 then
        content_frame.add({
            type = "label",
            caption = { "crafting-speed-extractor.no-machines" },
            style = "bold_label"
        })
    else
        -- Scroll pane for machine list
        local scroll = content_frame.add({
            type = "scroll-pane",
            direction = "vertical",
            vertical_scroll_policy = "auto",
            horizontal_scroll_policy = "never"
        })
        scroll.style.maximal_height = 350

        -- Table header
        local header_table = scroll.add({
            type = "table",
            column_count = 5,
            draw_horizontal_lines = true,
            draw_vertical_lines = false
        })
        header_table.style.horizontal_spacing = 16
        header_table.style.column_alignments[1] = "center"
        header_table.style.column_alignments[4] = "right"
        header_table.style.column_alignments[5] = "right"

        -- Header labels
        local headers = { "#", { "crafting-speed-extractor.col-machine" }, { "crafting-speed-extractor.col-recipe" }, { "crafting-speed-extractor.col-speed" }, { "crafting-speed-extractor.col-productivity" } }
        for _, h in ipairs(headers) do
            header_table.add({
                type = "label",
                caption = h,
                style = "bold_label"
            })
        end

        -- Machine rows
        for i, machine in ipairs(machines) do
            header_table.add({
                type = "label",
                caption = tostring(i)
            })
            header_table.add({
                type = "label",
                caption = machine.name
            })
            header_table.add({
                type = "label",
                caption = machine.recipe
            })
            header_table.add({
                type = "label",
                caption = string.format("%.2f", machine.crafting_speed)
            })
            header_table.add({
                type = "label",
                caption = string.format("%.1f%%", machine.productivity)
            })
        end
    end

    -- Button flow
    local button_flow = frame.add({
        type = "flow",
        direction = "horizontal"
    })
    button_flow.style.horizontal_spacing = 8
    button_flow.style.top_margin = 8
    button_flow.style.horizontally_stretchable = true
    button_flow.style.horizontal_align = "right"

    -- Copy button (only if we have machines)
    if #machines > 0 then
        button_flow.add({
            type = "button",
            name = "crafting_speed_extractor_copy",
            caption = { "crafting-speed-extractor.copy-button" },
            style = "confirm_button"
        })
    end

    -- Close button
    button_flow.add({
        type = "button",
        name = "crafting_speed_extractor_close",
        caption = { "crafting-speed-extractor.close-button" }
    })

    player.opened = frame
end

-- ============================================================================
-- Event Handlers
-- ============================================================================

---Handle selection tool area selection
---@param event EventData.on_player_selected_area
local function on_player_selected_area(event)
    if event.item ~= "crafting-speed-analyzer" then
        return
    end

    local player = game.get_player(event.player_index)
    if not player then
        return
    end

    init_player_data(event.player_index)

    -- Extract machine data
    local machines = extract_all_machines(event.entities)
    storage[event.player_index].machines = machines

    -- Show GUI
    create_gui(player, machines)

    if #machines == 0 then
        player.print({ "crafting-speed-extractor.no-machines-selected" })
    else
        player.print({ "crafting-speed-extractor.machines-found", #machines })
    end
end

---Handle GUI button clicks
---@param event EventData.on_gui_click
local function on_gui_click(event)
    local element = event.element
    if not element or not element.valid then
        return
    end

    local player = game.get_player(event.player_index)
    if not player then
        return
    end

    if element.name == "crafting_speed_extractor_copy" then
        -- Show copy popup with JSON text
        local player_data = storage[event.player_index]
        if player_data and player_data.machines and #player_data.machines > 0 then
            local json = machines_to_json(player_data.machines)
            create_copy_popup(player, json)
        else
            player.print("[Crafting Speed Extractor] No machine data found. Please select machines first.")
        end
    elseif element.name == "crafting_speed_extractor_close" then
        destroy_all_gui(player)
    elseif element.name == "crafting_speed_extractor_copy_close" then
        -- Close just the copy popup
        local copy_frame = player.gui.screen[COPY_GUI_NAME]
        if copy_frame and copy_frame.valid then
            copy_frame.destroy()
        end
    end
end

---Handle GUI close
---@param event EventData.on_gui_closed
local function on_gui_closed(event)
    if event.element and event.element.valid and event.element.name == GUI_NAME then
        local player = game.get_player(event.player_index)
        if player then
            destroy_gui(player)
        end
    end
end

-- ============================================================================
-- Event Registration
-- ============================================================================

script.on_event(defines.events.on_player_selected_area, on_player_selected_area)
script.on_event(defines.events.on_player_alt_selected_area, on_player_selected_area)
script.on_event(defines.events.on_gui_click, on_gui_click)
script.on_event(defines.events.on_gui_closed, on_gui_closed)

-- Initialize storage for new players
script.on_event(defines.events.on_player_created, function(event)
    init_player_data(event.player_index)
end)

-- Initialize storage on load
script.on_init(function()
    for _, player in pairs(game.players) do
        init_player_data(player.index)
    end
end)
