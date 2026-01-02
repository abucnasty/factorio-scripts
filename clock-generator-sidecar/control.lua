-- Clock Generator Sidecar - Control Stage
-- Runtime logic for selecting machines and extracting crafting data

-- ============================================================================
-- Global State Management
-- ============================================================================

---@class MachineData
---@field name string Machine entity name
---@field recipe string Recipe name (for machines/furnaces)
---@field crafting_speed number Effective crafting speed with bonuses (for machines/furnaces)
---@field productivity number Productivity bonus as percentage (0-100+)
---@field type "machine"|"furnace"|"mining-drill" Entity type category

---@class DrillData
---@field drill_type string The specific drill type (e.g., "electric-mining-drill")
---@field mined_item_name string The resource being mined
---@field speed_bonus number The speed bonus from modules/beacons
---@field productivity number Productivity bonus as percentage (for display only)
---@field drop_target_unit_number number|nil The unit_number of the entity the drill drops to

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

---Extract data from a mining drill
---@param entity LuaEntity
---@return DrillData|nil
local function extract_mining_drill_data(entity)
    if not entity or not entity.valid then
        return nil
    end

    -- Get what the drill is mining
    local mining_target = entity.mining_target
    if not mining_target then
        return nil
    end

    local total_productivity = entity.productivity_bonus or 0

    -- Speed bonus from modules/beacons (this is what clock-generator expects)
    local speed_bonus = entity.speed_bonus or 0
    
    -- Get the drop target (the entity the drill is putting items into)
    local drop_target = entity.drop_target
    local drop_target_unit_number = nil
    if drop_target and drop_target.valid and drop_target.unit_number then
        drop_target_unit_number = drop_target.unit_number
    end

    ---@type DrillData
    local data = {
        drill_type = entity.name, -- e.g., "electric-mining-drill"
        mined_item_name = mining_target.name, -- Resource being mined
        speed_bonus = speed_bonus, -- Speed bonus from modules/beacons
        productivity = total_productivity * 100, -- For display purposes
        drop_target_unit_number = drop_target_unit_number, -- For cross-referencing
    }

    return data
end

---Extract crafting data from a single crafting machine entity
---@param entity LuaEntity
---@return MachineData|nil
local function extract_crafting_machine_data(entity)
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

    -- Get entity productivity from modules/beacons
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

---Extract crafting data from a single entity (dispatches to appropriate handler)
---@param entity LuaEntity
---@return MachineData|nil
local function extract_machine_data(entity)
    if not entity or not entity.valid then
        return nil
    end

    -- Handle mining drills separately
    if entity.type == "mining-drill" then
        return extract_mining_drill_data(entity), "drill"
    end

    -- Handle crafting machines (assemblers, furnaces, etc.)
    return extract_crafting_machine_data(entity), "machine"
end

---@class ExtractionResult
---@field machines MachineData[]
---@field drills DrillData[]
---@field unit_number_to_id table<number, number> Maps entity unit_number to machine ID

---Extract data from all selected entities, separating machines and drills
---@param entities LuaEntity[]
---@return ExtractionResult
local function extract_all_entities(entities)
    local result = {
        machines = {},
        drills = {},
        unit_number_to_id = {}
    }
    
    -- First pass: extract machines and build unit_number -> id mapping
    local machine_id = 0
    for _, entity in pairs(entities) do
        if entity.type ~= "mining-drill" then
            local data, entity_category = extract_machine_data(entity)
            if data and entity_category == "machine" then
                machine_id = machine_id + 1
                table.insert(result.machines, data)
                -- Map the entity's unit_number to its assigned ID
                if entity.unit_number then
                    result.unit_number_to_id[entity.unit_number] = machine_id
                end
            end
        end
    end
    
    -- Second pass: extract drills (now we have the unit_number mapping)
    for _, entity in pairs(entities) do
        if entity.type == "mining-drill" then
            local data = extract_mining_drill_data(entity)
            if data then
                table.insert(result.drills, data)
            end
        end
    end

    return result
end

-- ============================================================================
-- JSON Export
-- ============================================================================

---Convert extraction result to clock-generator compatible JSON
---@param result ExtractionResult
---@return string
local function to_export_json(result)
    local export = {
        machines = {},
        drills = {}
    }
    
    -- Format machines for clock-generator
    for i, machine in ipairs(result.machines) do
        table.insert(export.machines, {
            id = i,
            recipe = machine.recipe,
            crafting_speed = machine.crafting_speed,
            productivity = machine.productivity,
            type = machine.type
        })
    end
    
    -- Format drills for clock-generator (different schema)
    for i, drill in ipairs(result.drills) do
        -- Look up the target machine ID from the unit_number mapping
        local target_machine_id = 1 -- Default fallback (must be >0)
        if drill.drop_target_unit_number then
            local mapped_id = result.unit_number_to_id[drill.drop_target_unit_number]
            if mapped_id then
                target_machine_id = mapped_id
            end
        end
        
        table.insert(export.drills, {
            id = i,
            type = drill.drill_type,
            mined_item_name = drill.mined_item_name,
            speed_bonus = drill.speed_bonus,
            target = {
                type = "machine",
                id = target_machine_id
            }
        })
    end

    return helpers.table_to_json(export)
end

-- ============================================================================
-- GUI Management
-- ============================================================================

local GUI_NAME = "clock_generator_sidecar_frame"
local COPY_GUI_NAME = "clock_generator_sidecar_copy_frame"

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
        caption = { "clock-generator-sidecar.copy-popup-title" }
    })
    frame.auto_center = true

    -- Instructions
    frame.add({
        type = "label",
        caption = { "clock-generator-sidecar.copy-instructions" }
    })

    -- Text box with JSON (user can select all and copy)
    local textbox = frame.add({
        type = "text-box",
        name = "clock_generator_sidecar_json_text",
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
        name = "clock_generator_sidecar_copy_close",
        caption = { "clock-generator-sidecar.close-button" }
    })

    -- Don't set player.opened here - it would close the main GUI and trigger destroy_gui
    -- The popup will stay open alongside the main GUI
end

---Create the extraction results GUI
---@param player LuaPlayer
---@param machines MachineData[]
---Create the GUI to display extracted data
---@param player LuaPlayer
---@param result ExtractionResult
local function create_gui(player, result)
    -- Remove existing GUI
    destroy_gui(player)

    local total_count = #result.machines + #result.drills

    -- Main frame
    local frame = player.gui.screen.add({
        type = "frame",
        name = GUI_NAME,
        direction = "vertical",
        caption = { "clock-generator-sidecar.gui-title" }
    })
    frame.auto_center = true

    -- Store reference
    storage[player.index].gui = frame

    -- Header flow with count
    local header = frame.add({
        type = "flow",
        direction = "horizontal"
    })
    header.style.horizontal_spacing = 8
    header.style.bottom_margin = 8

    header.add({
        type = "label",
        caption = { "clock-generator-sidecar.machine-count", total_count },
        style = "heading_2_label"
    })

    -- Content frame
    local content_frame = frame.add({
        type = "frame",
        direction = "vertical",
        style = "inside_shallow_frame_with_padding"
    })
    content_frame.style.minimal_width = 550
    content_frame.style.maximal_height = 450

    if total_count == 0 then
        content_frame.add({
            type = "label",
            caption = { "clock-generator-sidecar.no-machines" },
            style = "bold_label"
        })
    else
        -- Scroll pane for entity list
        local scroll = content_frame.add({
            type = "scroll-pane",
            direction = "vertical",
            vertical_scroll_policy = "auto",
            horizontal_scroll_policy = "never"
        })
        scroll.style.maximal_height = 400

        -- Display machines if any
        if #result.machines > 0 then
            local machines_header = scroll.add({
                type = "label",
                caption = "Machines & Furnaces (" .. #result.machines .. ")",
                style = "heading_2_label"
            })
            machines_header.style.bottom_margin = 4

            local machine_table = scroll.add({
                type = "table",
                column_count = 5,
                draw_horizontal_lines = true,
                draw_vertical_lines = false
            })
            machine_table.style.horizontal_spacing = 16
            machine_table.style.column_alignments[1] = "center"
            machine_table.style.column_alignments[4] = "right"
            machine_table.style.column_alignments[5] = "right"

            -- Header labels for machines
            local m_headers = { "#", { "clock-generator-sidecar.col-machine" }, { "clock-generator-sidecar.col-recipe" }, { "clock-generator-sidecar.col-speed" }, { "clock-generator-sidecar.col-productivity" } }
            for _, h in ipairs(m_headers) do
                machine_table.add({
                    type = "label",
                    caption = h,
                    style = "bold_label"
                })
            end

            -- Machine rows
            for i, machine in ipairs(result.machines) do
                machine_table.add({ type = "label", caption = tostring(i) })
                machine_table.add({ type = "label", caption = machine.name })
                machine_table.add({ type = "label", caption = machine.recipe })
                machine_table.add({ type = "label", caption = string.format("%.2f", machine.crafting_speed) })
                machine_table.add({ type = "label", caption = string.format("%.1f%%", machine.productivity) })
            end

            -- Add spacing if drills follow
            if #result.drills > 0 then
                local spacer = scroll.add({ type = "flow" })
                spacer.style.height = 16
            end
        end

        -- Display drills if any
        if #result.drills > 0 then
            local drills_header = scroll.add({
                type = "label",
                caption = "Mining Drills (" .. #result.drills .. ")",
                style = "heading_2_label"
            })
            drills_header.style.bottom_margin = 4

            local drill_table = scroll.add({
                type = "table",
                column_count = 5,
                draw_horizontal_lines = true,
                draw_vertical_lines = false
            })
            drill_table.style.horizontal_spacing = 16
            drill_table.style.column_alignments[1] = "center"
            drill_table.style.column_alignments[4] = "right"
            drill_table.style.column_alignments[5] = "right"

            -- Header labels for drills
            local d_headers = { "#", "Drill Type", "Resource", "Speed Bonus", { "clock-generator-sidecar.col-productivity" } }
            for _, h in ipairs(d_headers) do
                drill_table.add({
                    type = "label",
                    caption = h,
                    style = "bold_label"
                })
            end

            -- Drill rows
            for i, drill in ipairs(result.drills) do
                drill_table.add({ type = "label", caption = tostring(i) })
                drill_table.add({ type = "label", caption = drill.drill_type })
                drill_table.add({ type = "label", caption = drill.mined_item_name })
                drill_table.add({ type = "label", caption = string.format("+%.0f%%", drill.speed_bonus * 100) })
                drill_table.add({ type = "label", caption = string.format("%.1f%%", drill.productivity) })
            end
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

    -- Copy button (only if we have data)
    if total_count > 0 then
        button_flow.add({
            type = "button",
            name = "clock_generator_sidecar_copy",
            caption = { "clock-generator-sidecar.copy-button" },
            style = "confirm_button"
        })
    end

    -- Close button
    button_flow.add({
        type = "button",
        name = "clock_generator_sidecar_close",
        caption = { "clock-generator-sidecar.close-button" }
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

    -- Extract entity data (machines and drills separately)
    local result = extract_all_entities(event.entities)
    storage[event.player_index].extraction_result = result

    -- Show GUI
    create_gui(player, result)

    local total = #result.machines + #result.drills
    if total == 0 then
        player.print({ "clock-generator-sidecar.no-machines-selected" })
    else
        player.print({ "clock-generator-sidecar.machines-found", total })
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

    if element.name == "clock_generator_sidecar_copy" then
        -- Show copy popup with JSON text
        local player_data = storage[event.player_index]
        if player_data and player_data.extraction_result then
            local result = player_data.extraction_result
            if #result.machines > 0 or #result.drills > 0 then
                local json = to_export_json(result)
                create_copy_popup(player, json)
            else
                player.print("[Clock Generator Sidecar] No data found. Please select machines or drills first.")
            end
        else
            player.print("[Clock Generator Sidecar] No data found. Please select machines or drills first.")
        end
    elseif element.name == "clock_generator_sidecar_close" then
        destroy_all_gui(player)
    elseif element.name == "clock_generator_sidecar_copy_close" then
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
