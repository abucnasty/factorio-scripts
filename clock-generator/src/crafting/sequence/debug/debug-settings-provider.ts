import { DebugSettings } from "./debug-settings";

export interface DebugSettingsProvider {
    settings(): DebugSettings;
}

class MutableDebugSettingsProvider implements DebugSettingsProvider {
    private debug_settings: DebugSettings = {
        enabled: true,
    };

    public enable(): void {
        this.debug_settings.enabled = true;
    }

    public disable(): void {
        this.debug_settings.enabled = false;
    }

    public setSettings(settings: DebugSettings): void {
        this.debug_settings = settings;
    }

    public settings(): DebugSettings {
        return this.debug_settings;
    }
}

class ImmutableDebugSettingsProvider implements DebugSettingsProvider {
    constructor(
        private readonly debug_settings: DebugSettings
    ) { }

    public settings(): DebugSettings {
        return this.debug_settings;
    }
}

export const DebugSettingsProvider = {
    mutable: () => new MutableDebugSettingsProvider(),
    immutable: (settings: DebugSettings) => new ImmutableDebugSettingsProvider(settings),
}