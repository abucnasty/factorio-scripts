import { useCallback, useEffect, useState } from 'react';
import type { Config } from 'clock-generator/browser';

const STORAGE_KEY = 'clock-generator-config';

export interface MachineFormData {
    id: number;
    recipe: string;
    productivity: number;
    crafting_speed: number;
    type?: 'machine' | 'furnace';
}

// Enable control override types
export type EnableControlMode = 'AUTO' | 'ALWAYS' | 'NEVER' | 'CLOCKED';

export interface EnableControlRange {
    start: number;
    end: number;
}

export interface EnableControlOverride {
    mode: EnableControlMode;
    ranges?: EnableControlRange[];
    period_duration_ticks?: number;
}

export interface InserterOverrides {
    animation?: {
        pickup_duration_ticks?: number;
    };
    enable_control?: EnableControlOverride;
}

export interface InserterFormData {
    source: { type: 'machine' | 'belt' | 'chest'; id: number };
    sink: { type: 'machine' | 'belt' | 'chest'; id: number };
    stack_size: number;
    filters?: string[];
    overrides?: InserterOverrides;
}

export interface BeltLaneFormData {
    ingredient: string;
    stack_size: number;
}

export interface BeltFormData {
    id: number;
    type: 'transport-belt' | 'fast-transport-belt' | 'express-transport-belt' | 'turbo-transport-belt';
    lanes: [BeltLaneFormData] | [BeltLaneFormData, BeltLaneFormData];
}

export const BELT_FORM_DEFAULT_TYPE = 'turbo-transport-belt';
export const BELT_FORM_DEFAULT_STACK_SIZE = 4;

export interface DrillOverrides {
    enable_control?: EnableControlOverride;
}

export interface DrillFormData {
    id: number;
    type: 'electric-mining-drill' | 'burner-mining-drill' | 'big-mining-drill';
    mined_item_name: string;
    speed_bonus: number;
    target: { type: 'machine'; id: number };
    overrides?: DrillOverrides;
}

export interface ChestFormData {
    id: number;
    storage_size: number;
    item_filter: string;
}

export interface ConfigFormData {
    target_output: {
        recipe: string;
        items_per_second: number;
        /** Number of duplicate setups being modeled (multiplier for ratio calculations) */
        copies: number;
    };
    machines: MachineFormData[];
    inserters: InserterFormData[];
    belts: BeltFormData[];
    chests: ChestFormData[];
    drills?: {
        mining_productivity_level: number;
        configs: DrillFormData[];
    };
    overrides?: {
        lcm?: number;
        terminal_swing_count?: number;
    };
}

const createDefaultConfig = (): ConfigFormData => ({
    target_output: {
        recipe: '',
        items_per_second: 1,
        copies: 1,
    },
    machines: [
        {
            id: 1,
            recipe: '',
            productivity: 0,
            crafting_speed: 1,
        },
    ],
    inserters: [],
    belts: [],
    chests: [],
});

/** Load config from localStorage, returns default if not found or invalid */
function loadConfigFromStorage(): ConfigFormData {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Basic validation - check if it has the required fields
            if (parsed && parsed.target_output && parsed.machines && parsed.chests) {
                return parsed as ConfigFormData;
            }
        }
    } catch (e) {
        console.warn('Failed to load config from localStorage:', e);
    }
    return createDefaultConfig();
}

/** Save config to localStorage */
function saveConfigToStorage(config: ConfigFormData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Failed to save config to localStorage:', e);
    }
}

export interface UseConfigFormResult {
    config: ConfigFormData;
    setConfig: React.Dispatch<React.SetStateAction<ConfigFormData>>;
    
    // Target output
    updateTargetOutput: (field: keyof ConfigFormData['target_output'], value: string | number) => void;
    
    // Machines
    addMachine: () => void;
    updateMachine: (index: number, field: keyof MachineFormData, value: string | number) => void;
    removeMachine: (index: number) => void;
    mergeMachines: (machines: MachineFormData[]) => void;
    replaceMachines: (machines: MachineFormData[]) => void;
    
    // Inserters
    addInserter: () => void;
    updateInserter: (index: number, updates: Partial<InserterFormData>) => void;
    removeInserter: (index: number) => void;
    replaceInserters: (inserters: InserterFormData[]) => void;
    
    // Belts
    addBelt: () => void;
    updateBelt: (index: number, updates: Partial<BeltFormData>) => void;
    removeBelt: (index: number) => void;
    replaceBelts: (belts: BeltFormData[]) => void;
    
    // Chests
    addChest: () => void;
    updateChest: (index: number, updates: Partial<ChestFormData>) => void;
    removeChest: (index: number) => void;
    
    // Drills
    enableDrills: () => void;
    disableDrills: () => void;
    updateDrillsConfig: (field: 'mining_productivity_level', value: number) => void;
    addDrill: () => void;
    updateDrill: (index: number, updates: Partial<DrillFormData>) => void;
    removeDrill: (index: number) => void;
    mergeDrills: (drills: DrillFormData[]) => void;
    replaceDrills: (drills: DrillFormData[]) => void;
    
    // Overrides
    updateOverrides: (field: keyof NonNullable<ConfigFormData['overrides']>, value: number | null) => void;
    
    // Import/Export
    importConfig: (config: Config) => void;
    exportConfig: () => Config;
    resetConfig: () => void;
}

export function useConfigForm(): UseConfigFormResult {
    const [config, setConfig] = useState<ConfigFormData>(loadConfigFromStorage);

    // Save config to localStorage whenever it changes
    useEffect(() => {
        saveConfigToStorage(config);
    }, [config]);

    // Target output
    const updateTargetOutput = useCallback((
        field: keyof ConfigFormData['target_output'],
        value: string | number
    ) => {
        setConfig((prev) => ({
            ...prev,
            target_output: {
                ...prev.target_output,
                [field]: value,
            },
        }));
    }, []);

    // Machines
    const addMachine = useCallback(() => {
        setConfig((prev) => {
            const maxId = Math.max(0, ...prev.machines.map((m) => m.id));
            return {
                ...prev,
                machines: [
                    ...prev.machines,
                    {
                        id: maxId + 1,
                        recipe: '',
                        productivity: 0,
                        crafting_speed: 1,
                    },
                ],
            };
        });
    }, []);

    const updateMachine = useCallback((
        index: number,
        field: keyof MachineFormData,
        value: string | number
    ) => {
        setConfig((prev) => ({
            ...prev,
            machines: prev.machines.map((m, i) =>
                i === index ? { ...m, [field]: value } : m
            ),
        }));
    }, []);

    const removeMachine = useCallback((index: number) => {
        setConfig((prev) => ({
            ...prev,
            machines: prev.machines.filter((_, i) => i !== index),
        }));
    }, []);

    const mergeMachines = useCallback((newMachines: MachineFormData[]) => {
        setConfig((prev) => {
            // Reassign IDs to avoid conflicts
            const maxId = Math.max(0, ...prev.machines.map((m) => m.id));
            const machinesWithNewIds = newMachines.map((m, i) => ({
                ...m,
                id: maxId + i + 1,
            }));
            return {
                ...prev,
                machines: [...prev.machines, ...machinesWithNewIds],
            };
        });
    }, []);

    const replaceMachines = useCallback((newMachines: MachineFormData[]) => {
        setConfig((prev) => ({
            ...prev,
            machines: newMachines,
        }));
    }, []);

    // Inserters
    const addInserter = useCallback(() => {
        setConfig((prev) => ({
            ...prev,
            inserters: [
                ...prev.inserters,
                {
                    source: { type: 'machine', id: 1 },
                    sink: { type: 'belt', id: 1 },
                    stack_size: 16,
                },
            ],
        }));
    }, []);

    const updateInserter = useCallback((index: number, updates: Partial<InserterFormData>) => {
        setConfig((prev) => ({
            ...prev,
            inserters: prev.inserters.map((ins, i) =>
                i === index ? { ...ins, ...updates } : ins
            ),
        }));
    }, []);

    const removeInserter = useCallback((index: number) => {
        setConfig((prev) => ({
            ...prev,
            inserters: prev.inserters.filter((_, i) => i !== index),
        }));
    }, []);

    const replaceInserters = useCallback((newInserters: InserterFormData[]) => {
        setConfig((prev) => ({
            ...prev,
            inserters: newInserters,
        }));
    }, []);

    // Belts
    const addBelt = useCallback(() => {
        setConfig((prev) => {
            const maxId = Math.max(0, ...prev.belts.map((b) => b.id));
            return {
                ...prev,
                belts: [
                    ...prev.belts,
                    {
                        id: maxId + 1,
                        type: BELT_FORM_DEFAULT_TYPE,
                        lanes: [{ ingredient: '', stack_size: BELT_FORM_DEFAULT_STACK_SIZE }] as [BeltLaneFormData],
                    },
                ],
            };
        });
    }, []);

    const updateBelt = useCallback((index: number, updates: Partial<BeltFormData>) => {
        setConfig((prev) => ({
            ...prev,
            belts: prev.belts.map((b, i) =>
                i === index ? { ...b, ...updates } : b
            ),
        }));
    }, []);

    const removeBelt = useCallback((index: number) => {
        setConfig((prev) => ({
            ...prev,
            belts: prev.belts.filter((_, i) => i !== index),
        }));
    }, []);

    const replaceBelts = useCallback((newBelts: BeltFormData[]) => {
        setConfig((prev) => ({
            ...prev,
            belts: newBelts,
        }));
    }, []);

    // Chests
    const addChest = useCallback(() => {
        setConfig((prev) => {
            const maxId = Math.max(0, ...prev.chests.map((c) => c.id));
            return {
                ...prev,
                chests: [
                    ...prev.chests,
                    {
                        id: maxId + 1,
                        storage_size: 1,
                        item_filter: '',
                    },
                ],
            };
        });
    }, []);

    const updateChest = useCallback((index: number, updates: Partial<ChestFormData>) => {
        setConfig((prev) => ({
            ...prev,
            chests: prev.chests.map((c, i) =>
                i === index ? { ...c, ...updates } : c
            ),
        }));
    }, []);

    const removeChest = useCallback((index: number) => {
        setConfig((prev) => ({
            ...prev,
            chests: prev.chests.filter((_, i) => i !== index),
        }));
    }, []);

    // Drills
    const enableDrills = useCallback(() => {
        setConfig((prev) => ({
            ...prev,
            drills: {
                mining_productivity_level: 0,
                configs: [],
            },
        }));
    }, []);

    const disableDrills = useCallback(() => {
        setConfig((prev) => {
            const { drills: _, ...rest } = prev;
            return rest as ConfigFormData;
        });
    }, []);

    const updateDrillsConfig = useCallback((field: 'mining_productivity_level', value: number) => {
        setConfig((prev) => {
            if (!prev.drills) return prev;
            return {
                ...prev,
                drills: {
                    ...prev.drills,
                    [field]: value,
                },
            };
        });
    }, []);

    const addDrill = useCallback(() => {
        setConfig((prev) => {
            if (!prev.drills) return prev;
            const maxId = Math.max(0, ...prev.drills.configs.map((d) => d.id));
            return {
                ...prev,
                drills: {
                    ...prev.drills,
                    configs: [
                        ...prev.drills.configs,
                        {
                            id: maxId + 1,
                            type: 'electric-mining-drill' as const,
                            mined_item_name: '',
                            speed_bonus: 0,
                            target: { type: 'machine' as const, id: 1 },
                        },
                    ],
                },
            };
        });
    }, []);

    const updateDrill = useCallback((index: number, updates: Partial<DrillFormData>) => {
        setConfig((prev) => {
            if (!prev.drills) return prev;
            return {
                ...prev,
                drills: {
                    ...prev.drills,
                    configs: prev.drills.configs.map((d, i) =>
                        i === index ? { ...d, ...updates } : d
                    ),
                },
            };
        });
    }, []);

    const removeDrill = useCallback((index: number) => {
        setConfig((prev) => {
            if (!prev.drills) return prev;
            return {
                ...prev,
                drills: {
                    ...prev.drills,
                    configs: prev.drills.configs.filter((_, i) => i !== index),
                },
            };
        });
    }, []);

    const mergeDrills = useCallback((newDrills: DrillFormData[]) => {
        setConfig((prev) => {
            // If drills aren't enabled, enable them first
            const currentDrills = prev.drills ?? {
                mining_productivity_level: 0,
                configs: [],
            };
            
            // Reassign IDs to avoid conflicts
            const maxId = Math.max(0, ...currentDrills.configs.map((d) => d.id));
            const drillsWithNewIds = newDrills.map((d, i) => ({
                ...d,
                id: maxId + i + 1,
            }));
            
            return {
                ...prev,
                drills: {
                    ...currentDrills,
                    configs: [...currentDrills.configs, ...drillsWithNewIds],
                },
            };
        });
    }, []);

    const replaceDrills = useCallback((newDrills: DrillFormData[]) => {
        setConfig((prev) => {
            // If drills aren't enabled, enable them first
            const currentDrills = prev.drills ?? {
                mining_productivity_level: 0,
                configs: [],
            };
            
            return {
                ...prev,
                drills: {
                    ...currentDrills,
                    configs: newDrills,
                },
            };
        });
    }, []);

    // Overrides
    const updateOverrides = useCallback((
        field: keyof NonNullable<ConfigFormData['overrides']>,
        value: number | null
    ) => {
        setConfig((prev) => {
            const newOverrides = {
                ...prev.overrides,
                [field]: value,
            };
            // Remove undefined values
            Object.keys(newOverrides).forEach((key) => {
                if (newOverrides[key as keyof typeof newOverrides] === undefined) {
                    delete newOverrides[key as keyof typeof newOverrides];
                }
            });
            // If no overrides left, remove the object
            if (Object.keys(newOverrides).length === 0) {
                const { overrides: _, ...rest } = prev;
                return rest as ConfigFormData;
            }
            return {
                ...prev,
                overrides: newOverrides,
            };
        });
    }, []);

    // Helper to convert imported enable control override to form data
    const mapEnableControlOverride = (ec: { mode: string; ranges?: { start: number; end: number }[]; period_duration_ticks?: number }): EnableControlOverride => {
        const base: EnableControlOverride = { mode: ec.mode as EnableControlMode };
        if (ec.mode === 'CLOCKED') {
            base.ranges = ec.ranges?.map(r => ({ start: r.start, end: r.end }));
            base.period_duration_ticks = ec.period_duration_ticks;
        }
        return base;
    };

    // Import/Export
    const importConfig = useCallback((imported: Config) => {
        const formData: ConfigFormData = {
            target_output: imported.target_output,
            machines: imported.machines.map((m) => ({
                id: m.id,
                recipe: m.recipe,
                productivity: m.productivity,
                crafting_speed: m.crafting_speed,
                type: m.type,
            })),
            inserters: imported.inserters.map((ins) => ({
                source: ins.source,
                sink: ins.sink,
                stack_size: ins.stack_size,
                filters: ins.filters,
                overrides: ins.overrides ? {
                    animation: ins.overrides.animation,
                    enable_control: ins.overrides.enable_control 
                        ? mapEnableControlOverride(ins.overrides.enable_control)
                        : undefined,
                } : undefined,
            })),
            belts: imported.belts.map((b) => ({
                id: b.id,
                type: b.type,
                lanes: b.lanes as [BeltLaneFormData] | [BeltLaneFormData, BeltLaneFormData],
            })),
            chests: (imported.chests ?? []).map((c: { id: number; storage_size: number; item_filter: string }) => ({
                id: c.id,
                storage_size: c.storage_size,
                item_filter: c.item_filter,
            })),
            drills: imported.drills
                ? {
                    mining_productivity_level: imported.drills.mining_productivity_level,
                    configs: imported.drills.configs.map((d) => ({
                        id: d.id,
                        type: d.type,
                        mined_item_name: d.mined_item_name,
                        speed_bonus: d.speed_bonus,
                        target: d.target,
                        overrides: d.overrides?.enable_control ? {
                            enable_control: mapEnableControlOverride(d.overrides.enable_control),
                        } : undefined,
                    })),
                }
                : undefined,
            overrides: imported.overrides,
        };
        setConfig(formData);
    }, []);

    const exportConfig = useCallback((): Config => {
        return config as Config;
    }, [config]);

    const resetConfig = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setConfig(createDefaultConfig());
    }, []);

    return {
        config,
        setConfig,
        updateTargetOutput,
        addMachine,
        updateMachine,
        removeMachine,
        mergeMachines,
        replaceMachines,
        addInserter,
        updateInserter,
        removeInserter,
        replaceInserters,
        addBelt,
        updateBelt,
        removeBelt,
        replaceBelts,
        addChest,
        updateChest,
        removeChest,
        enableDrills,
        disableDrills,
        updateDrillsConfig,
        addDrill,
        updateDrill,
        removeDrill,
        mergeDrills,
        replaceDrills,
        updateOverrides,
        importConfig,
        exportConfig,
        resetConfig,
    };
}
