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

---@class BeltLaneData
---@field ingredient string|nil The item on this lane (nil if empty or mixed)
---@field stack_size number The belt stack size

---@class BeltData
---@field belt_type string The belt type (e.g., "transport-belt", "express-transport-belt")
---@field unit_number number The unit number of the belt entity
---@field lanes BeltLaneData[] Data for each lane (1 = right, 2 = left)

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

---Determine the target type for an entity
---@param entity LuaEntity
---@return "machine"|"belt"|"chest"|nil
local function get_target_type(entity)
    if not entity or not entity.valid then
        return nil
    end
    
    local entity_type = entity.type
    
    -- Machines (assemblers, furnaces, labs)
    if entity_type == "assembling-machine" or entity_type == "furnace" or entity_type == "lab" then
        return "machine"
    end
    
    -- Belts
    if entity_type == "transport-belt" or entity_type == "underground-belt" or 
       entity_type == "splitter" or entity_type == "loader" or entity_type == "loader-1x1" then
        return "belt"
    end
    
    -- Containers/Chests
    if entity_type == "container" or entity_type == "logistic-container" or 
       entity_type == "linked-container" or entity_type == "infinity-container" then
        return "chest"
    end
    
    return nil
end

---Get the primary ingredient and max stack size from a transport line
---@param transport_line LuaTransportLine
---@param default_stack_size number? The default stack size to use if no items are found (default 1)
---@return string|nil ingredient The primary ingredient name, or nil
---@return number stack_size The maximum stack size found on this lane, or default_stack_size
local function get_lane_info(transport_line, default_stack_size)
    default_stack_size = default_stack_size or 1
    
    if not transport_line or not transport_line.valid then
        return nil, default_stack_size
    end
    
    local contents = transport_line.get_contents()
    if not contents or #contents == 0 then
        return nil, default_stack_size
    end
    
    -- Get the first item found on this lane
    -- contents is an array of {name, quality, count}
    local first_item = contents[1]
    local ingredient = first_item and first_item.name or nil
    
    -- Get max stack size from detailed contents
    local max_stack = 1
    local detailed = transport_line.get_detailed_contents()
    if detailed then
        for _, item_info in pairs(detailed) do
            if item_info.stack and item_info.stack.valid and item_info.stack.count then
                max_stack = math.max(max_stack, item_info.stack.count)
            end
        end
    end
    
    return ingredient, max_stack
end

---Normalize belt name to transport belt type (converts underground belts and splitters)
---@param name string The entity name (e.g., "turbo-underground-belt", "fast-splitter")
---@return string The normalized transport belt name (e.g., "turbo-transport-belt", "fast-transport-belt")
local function normalize_belt_type(name)
    -- Map underground belts to transport belts
    local underground_to_belt = {
        ["underground-belt"] = "transport-belt",
        ["fast-underground-belt"] = "fast-transport-belt",
        ["express-underground-belt"] = "express-transport-belt",
        ["turbo-underground-belt"] = "turbo-transport-belt"
    }
    
    -- Map splitters to transport belts
    local splitter_to_belt = {
        ["splitter"] = "transport-belt",
        ["fast-splitter"] = "fast-transport-belt",
        ["express-splitter"] = "express-transport-belt",
        ["turbo-splitter"] = "turbo-transport-belt"
    }
    
    return underground_to_belt[name] or splitter_to_belt[name] or name
end

---Extract data from a transport belt
---@param entity LuaEntity
---@return BeltData|nil
local function extract_belt_data(entity)
    if not entity or not entity.valid then
        return nil
    end
    
    -- Only accept transport-belt entity type (covers all belt tiers)
    if entity.prototype.subgroup.name ~= "belt" then
        return nil
    end
    
    -- Get the researched belt stack size for this force (1 + bonus)
    local default_belt_stack_size = 1
    if entity.force then
        default_belt_stack_size = 1 + (entity.force.belt_stack_size_bonus or 0)
    end
    
    local lanes = {}
    
    -- Transport belts have 2 lines: 1 = right lane, 2 = left lane
    local max_lines = entity.get_max_transport_line_index()
    
    local has_items = false
    for i = 1, math.min(max_lines, 2) do
        local transport_line = entity.get_transport_line(i)
        local ingredient, stack_size = get_lane_info(transport_line, default_belt_stack_size)
        
        if ingredient then
            has_items = true
        end
        
        table.insert(lanes, {
            ingredient = ingredient,
            stack_size = stack_size
        })
    end
    
    -- Skip belts with no items on them
    if not has_items then
        return nil
    end
    
    ---@type BeltData
    local data = {
        belt_type = normalize_belt_type(entity.name),
        unit_number = entity.unit_number,
        lanes = lanes
    }
    
    return data
end

---Extract data from an inserter
---@param entity LuaEntity
---@return InserterData|nil
local function extract_inserter_data(entity)
    if not entity or not entity.valid then
        return nil
    end
    
    if entity.type ~= "inserter" then
        return nil
    end
    
    -- Get stack size (use inserter_stack_size_override if set, otherwise the current target pickup count)
    local stack_size = entity.inserter_stack_size_override
    if stack_size == 0 then
        -- No override, use the effective stack size
        stack_size = entity.inserter_target_pickup_count
    end
    
    -- Get filters
    local filters = {}
    local filter_slot_count = entity.filter_slot_count or 0
    for i = 1, filter_slot_count do
        local filter = entity.get_filter(i)
        if filter and filter.name then
            table.insert(filters, filter.name)
        end
    end
    
    -- Get source (pickup target)
    local source = nil
    local source_recipe_outputs = nil
    local source_belt_lanes = nil
    local pickup_target = entity.pickup_target
    if pickup_target and pickup_target.valid then
        local target_type = get_target_type(pickup_target)
        if target_type then
            source = {
                type = target_type,
                unit_number = pickup_target.unit_number
            }
            
            -- If source is a machine, get its recipe outputs for auto-configuration
            if target_type == "machine" then
                local recipe, _ = pickup_target.get_recipe()
                if recipe then
                    source_recipe_outputs = {}
                    for _, product in pairs(recipe.products) do
                        if product.type == "item" then
                            table.insert(source_recipe_outputs, product.name)
                        end
                    end
                end
            -- If source is a belt, get contents from each lane
            elseif target_type == "belt" then
                source_belt_lanes = {}
                local max_lines = pickup_target.get_max_transport_line_index()
                -- Check which lanes the inserter picks from
                local picks_left = entity.pickup_from_left_lane
                local picks_right = entity.pickup_from_right_lane
                
                -- Get the researched belt stack size for this force
                local default_belt_stack_size = 1
                if pickup_target.force then
                    default_belt_stack_size = 1 + (pickup_target.force.belt_stack_size_bonus or 0)
                end
                
                for i = 1, math.min(max_lines, 2) do
                    local is_right_lane = (i == 1)
                    local is_left_lane = (i == 2)
                    
                    -- Only get contents for lanes the inserter actually picks from
                    if (is_right_lane and picks_right) or (is_left_lane and picks_left) then
                        local transport_line = pickup_target.get_transport_line(i)
                        local ingredient, _ = get_lane_info(transport_line, default_belt_stack_size)
                        if ingredient then
                            table.insert(source_belt_lanes, {
                                lane = i,
                                ingredient = ingredient
                            })
                        end
                    end
                end
            end
        end
    end
    
    -- Get sink (drop target)
    local sink = nil
    local drop_target = entity.drop_target
    if drop_target and drop_target.valid then
        local target_type = get_target_type(drop_target)
        if target_type then
            sink = {
                type = target_type,
                unit_number = drop_target.unit_number
            }
        end
    end
    
    ---@type InserterData
    local data = {
        inserter_type = entity.name,
        stack_size = stack_size,
        filters = filters,
        source = source,
        sink = sink,
        source_recipe_outputs = source_recipe_outputs,
        source_belt_lanes = source_belt_lanes
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

    -- Only handle entities with supported subgroups
    local supported_subgroups = {
        ["smelting-machine"] = true,
        ["production-machine"] = true
    }
    
    local prototype = entity.prototype
    local subgroup = prototype and prototype.subgroup and prototype.subgroup.name
    if not supported_subgroups[subgroup] then
        return nil
    end

    -- Handle crafting machines (assemblers, furnaces, etc.)
    return extract_crafting_machine_data(entity), "machine"
end

---@class ExtractionResult
---@field machines MachineData[]
---@field drills DrillData[]
---@field inserters InserterData[]
---@field belts BeltData[]
---@field unit_number_to_id table<number, number> Maps entity unit_number to machine ID
---@field belt_unit_number_to_id table<number, number> Maps belt unit_number to belt ID

---Extract data from all selected entities, separating machines, drills, inserters, and belts
---@param entities LuaEntity[]
---@return ExtractionResult
local function extract_all_entities(entities)
    local result = {
        machines = {},
        drills = {},
        inserters = {},
        belts = {},
        unit_number_to_id = {},
        belt_unit_number_to_id = {}
    }
    
    -- First pass: extract machines and build unit_number -> id mapping
    local machine_id = 0
    for _, entity in pairs(entities) do
        if entity.type ~= "mining-drill" and entity.type ~= "inserter" and entity.type ~= "transport-belt" then
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
    
    -- Second pass: extract belts and build belt unit_number -> id mapping
    -- Consolidate belts by their ingredient set (belts with same ingredients are treated as one)
    local belt_id = 0
    local ingredient_signature_to_belt = {}  -- Maps "ingredient1|ingredient2" to {belt_id, data}
    
    for _, entity in pairs(entities) do
        local belt_data = extract_belt_data(entity)
        if belt_data then
            -- Create a signature based on the unique set of ingredients (sorted for consistency)
            local ingredient_set = {}
            for _, lane in ipairs(belt_data.lanes) do
                if lane.ingredient and lane.ingredient ~= "" then
                    ingredient_set[lane.ingredient] = true
                end
            end
            -- Convert set to sorted array
            local ingredients = {}
            for ingredient, _ in pairs(ingredient_set) do
                table.insert(ingredients, ingredient)
            end
            table.sort(ingredients)
            local signature = table.concat(ingredients, "|")
            
            local existing = ingredient_signature_to_belt[signature]
            if existing then
                -- Map this belt to the existing belt with same ingredients
                if entity.unit_number then
                    result.belt_unit_number_to_id[entity.unit_number] = existing.belt_id
                end
            else
                -- New unique belt line
                belt_id = belt_id + 1
                ingredient_signature_to_belt[signature] = {
                    belt_id = belt_id,
                    data = belt_data
                }
                table.insert(result.belts, belt_data)
                if entity.unit_number then
                    result.belt_unit_number_to_id[entity.unit_number] = belt_id
                end
            end
        end
    end
    
    -- Third pass: extract drills (now we have the unit_number mapping)
    for _, entity in pairs(entities) do
        if entity.type == "mining-drill" then
            local data = extract_mining_drill_data(entity)
            if data then
                table.insert(result.drills, data)
            end
        end
    end
    
    -- Fourth pass: extract inserters
    for _, entity in pairs(entities) do
        if entity.type == "inserter" then
            local data = extract_inserter_data(entity)
            if data then
                table.insert(result.inserters, data)
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
        drills = {},
        inserters = {},
        belts = {}
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
    
    -- Format belts for clock-generator
    for i, belt in ipairs(result.belts) do
        local lanes = {}
        for _, lane in ipairs(belt.lanes) do
            table.insert(lanes, {
                ingredient = lane.ingredient or "",
                stack_size = lane.stack_size
            })
        end
        
        table.insert(export.belts, {
            id = i,
            type = belt.belt_type,
            lanes = lanes
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
    
    -- Format inserters for clock-generator
    for _, inserter in ipairs(result.inserters) do
        -- Resolve source target ID (machines or belts)
        local source_config = nil
        if inserter.source then
            local source_id = 1 -- Default fallback
            if inserter.source.unit_number then
                if inserter.source.type == "belt" then
                    -- Look up belt ID
                    local mapped_id = result.belt_unit_number_to_id[inserter.source.unit_number]
                    if mapped_id then
                        source_id = mapped_id
                    end
                else
                    -- Look up machine/chest ID
                    local mapped_id = result.unit_number_to_id[inserter.source.unit_number]
                    if mapped_id then
                        source_id = mapped_id
                    end
                end
            end
            source_config = {
                type = inserter.source.type,
                id = source_id
            }
        end
        
        -- Resolve sink target ID (machines or belts)
        local sink_config = nil
        if inserter.sink then
            local sink_id = 1 -- Default fallback
            if inserter.sink.unit_number then
                if inserter.sink.type == "belt" then
                    -- Look up belt ID
                    local mapped_id = result.belt_unit_number_to_id[inserter.sink.unit_number]
                    if mapped_id then
                        sink_id = mapped_id
                    end
                else
                    -- Look up machine/chest ID
                    local mapped_id = result.unit_number_to_id[inserter.sink.unit_number]
                    if mapped_id then
                        sink_id = mapped_id
                    end
                end
            end
            sink_config = {
                type = inserter.sink.type,
                id = sink_id
            }
        end
        
        -- Only include inserter if both source and sink are known
        if source_config and sink_config then
            local inserter_export = {
                source = source_config,
                sink = sink_config,
                stack_size = inserter.stack_size
            }
            
            -- Determine filters - use explicit filters first, then infer from source
            local filters = {}
            if #inserter.filters > 0 then
                filters = inserter.filters
            elseif inserter.source_recipe_outputs and #inserter.source_recipe_outputs > 0 then
                -- Infer from source machine's recipe outputs
                filters = inserter.source_recipe_outputs
            elseif inserter.source_belt_lanes and #inserter.source_belt_lanes > 0 then
                -- Infer from source belt's lane contents
                for _, lane_data in ipairs(inserter.source_belt_lanes) do
                    if lane_data.ingredient then
                        table.insert(filters, lane_data.ingredient)
                    end
                end
            end
            
            -- Add filters if any exist (including inferred ones)
            if #filters > 0 then
                inserter_export.filters = filters
            end
            
            table.insert(export.inserters, inserter_export)
        end
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
---@param clear_data boolean? Whether to also clear the extraction result data (default: false)
local function destroy_gui(player, clear_data)
    local frame = player.gui.screen[GUI_NAME]
    if frame and frame.valid then
        frame.destroy()
    end
    if storage[player.index] then
        storage[player.index].gui = nil
        if clear_data then
            storage[player.index].extraction_result = nil
        end
    end
end

---Destroy all GUIs for a player (including copy popup)
---@param player LuaPlayer
---@param clear_data boolean? Whether to also clear the extraction result data (default: true)
local function destroy_all_gui(player, clear_data)
    if clear_data == nil then
        clear_data = true
    end
    destroy_gui(player, clear_data)
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

    local total_count = #result.machines + #result.drills + #result.inserters + #result.belts

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
        caption = { "clock-generator-sidecar.entity-count", total_count },
        style = "heading_2_label"
    })

    -- Content frame
    local content_frame = frame.add({
        type = "frame",
        direction = "vertical",
        style = "inside_shallow_frame_with_padding"
    })
    content_frame.style.minimal_width = 600
    content_frame.style.maximal_height = 500

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
        scroll.style.maximal_height = 500

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
            
            -- Add spacing if inserters follow
            if #result.inserters > 0 then
                local spacer = scroll.add({ type = "flow" })
                spacer.style.height = 16
            end
        end
        
        -- Display inserters if any
        if #result.inserters > 0 then
            local inserters_header = scroll.add({
                type = "label",
                caption = "Inserters (" .. #result.inserters .. ")",
                style = "heading_2_label"
            })
            inserters_header.style.bottom_margin = 4

            local inserter_table = scroll.add({
                type = "table",
                column_count = 5,
                draw_horizontal_lines = true,
                draw_vertical_lines = false
            })
            inserter_table.style.horizontal_spacing = 16
            inserter_table.style.column_alignments[1] = "center"
            inserter_table.style.column_alignments[2] = "left"
            inserter_table.style.column_alignments[3] = "left"
            inserter_table.style.column_alignments[4] = "center"
            inserter_table.style.column_alignments[5] = "left"

            -- Header labels for inserters
            local i_headers = { "#", "Type", "Source", "Stack", "Sink" }
            for _, h in ipairs(i_headers) do
                inserter_table.add({
                    type = "label",
                    caption = h,
                    style = "bold_label"
                })
            end

            -- Inserter rows
            for i, inserter in ipairs(result.inserters) do
                inserter_table.add({ type = "label", caption = tostring(i) })
                inserter_table.add({ type = "label", caption = inserter.inserter_type })
                
                -- Source description
                local source_text = "?"
                if inserter.source then
                    source_text = inserter.source.type
                end
                inserter_table.add({ type = "label", caption = source_text })
                
                inserter_table.add({ type = "label", caption = tostring(inserter.stack_size) })
                
                -- Sink description
                local sink_text = "?"
                if inserter.sink then
                    sink_text = inserter.sink.type
                end
                inserter_table.add({ type = "label", caption = sink_text })
            end
            
            -- Add spacing if belts follow
            if #result.belts > 0 then
                local spacer = scroll.add({ type = "flow" })
                spacer.style.height = 16
            end
        end
        
        -- Display belts if any
        if #result.belts > 0 then
            local belts_header = scroll.add({
                type = "label",
                caption = "Transport Belts (" .. #result.belts .. ")",
                style = "heading_2_label"
            })
            belts_header.style.bottom_margin = 4

            local belt_table = scroll.add({
                type = "table",
                column_count = 4,
                draw_horizontal_lines = true,
                draw_vertical_lines = false
            })
            belt_table.style.horizontal_spacing = 16
            belt_table.style.column_alignments[1] = "center"
            belt_table.style.column_alignments[2] = "left"
            belt_table.style.column_alignments[3] = "left"
            belt_table.style.column_alignments[4] = "left"

            -- Header labels for belts
            local b_headers = { "#", "Type", "Lane 1", "Lane 2" }
            for _, h in ipairs(b_headers) do
                belt_table.add({
                    type = "label",
                    caption = h,
                    style = "bold_label"
                })
            end

            -- Belt rows
            for i, belt in ipairs(result.belts) do
                belt_table.add({ type = "label", caption = tostring(i) })
                belt_table.add({ type = "label", caption = belt.belt_type })
                
                -- Lane 1 (right lane)
                local lane1_text = "(empty)"
                if belt.lanes[1] and belt.lanes[1].ingredient then
                    lane1_text = belt.lanes[1].ingredient
                end
                belt_table.add({ type = "label", caption = lane1_text })
                
                -- Lane 2 (left lane)
                local lane2_text = "(empty)"
                if belt.lanes[2] and belt.lanes[2].ingredient then
                    lane2_text = belt.lanes[2].ingredient
                end
                belt_table.add({ type = "label", caption = lane2_text })
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

    -- Extract entity data (machines, drills, and inserters)
    local result = extract_all_entities(event.entities)
    storage[event.player_index].extraction_result = result

    -- Show GUI
    create_gui(player, result)

    local total = #result.machines + #result.drills + #result.inserters
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
            if #result.machines > 0 or #result.drills > 0 or #result.inserters > 0 then
                local json = to_export_json(result)
                create_copy_popup(player, json)
            else
                player.print("[Clock Generator Sidecar] No data found. Please select entities first.")
            end
        else
            player.print("[Clock Generator Sidecar] No data found. Please select entities first.")
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
            destroy_gui(player, true)  -- Clear data when user closes the window
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
