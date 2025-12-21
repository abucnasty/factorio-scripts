export interface DebugSettings {
    enabled?: boolean;
    relative_tick_mod?: number;
    plugin_settings?: {
        craft_event?: CraftEventPluginSettings;
    }
}

export interface CraftEventPluginSettings {
    print_bonus_progress: boolean;
    print_craft_progress: boolean;
}