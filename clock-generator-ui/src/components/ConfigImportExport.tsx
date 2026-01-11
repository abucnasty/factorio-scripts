import { Download, Upload, ContentPaste } from '@mui/icons-material';
import { Box, Button, Snackbar, Alert, Tooltip } from '@mui/material';
import { useRef, useState, useCallback } from 'react';
import type { Config } from 'clock-generator/browser';
import { MachineConfigurationSchema, MiningDrillConfigSchema, InserterConfigSchema, BeltConfigSchema, ChestConfigSchema } from 'clock-generator/browser';
import type { z } from 'zod';

type MachineConfiguration = z.infer<typeof MachineConfigurationSchema>;
type MiningDrillConfiguration = z.infer<typeof MiningDrillConfigSchema>;
type InserterConfiguration = z.infer<typeof InserterConfigSchema>;
type BeltConfiguration = z.infer<typeof BeltConfigSchema>;
type ChestConfiguration = z.infer<typeof ChestConfigSchema>;

interface ConfigImportExportProps {
    config: Config;
    onImport: (config: Config) => void;
    onReplaceMachines: (machines: MachineConfiguration[]) => void;
    onReplaceDrills: (drills: MiningDrillConfiguration[]) => void;
    onReplaceInserters: (inserters: InserterConfiguration[]) => void;
    onReplaceBelts: (belts: BeltConfiguration[]) => void;
    onReplaceChests: (chests: ChestConfiguration[]) => void;
    onUpdateMiningProductivityLevel: (level: number) => void;
    parseConfig: (content: string) => Promise<Config>;
}

export function ConfigImportExport({
    config,
    onImport,
    onReplaceMachines,
    onReplaceDrills,
    onReplaceInserters,
    onReplaceBelts,
    onReplaceChests,
    onUpdateMiningProductivityLevel,
    parseConfig,
}: ConfigImportExportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const handleExport = useCallback(() => {
        const target_recipe_name = config.target_output.recipe
        const jsonString = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clock-config-${target_recipe_name}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSnackbar({
            open: true,
            message: 'Configuration exported successfully!',
            severity: 'success',
        });
    }, [config]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            try {
                const content = await file.text();
                
                // Try to parse as JSON first
                let parsedConfig: Config;
                try {
                    parsedConfig = JSON.parse(content) as Config;
                } catch {
                    // If JSON parse fails, try as HOCON
                    parsedConfig = await parseConfig(content);
                }

                onImport(parsedConfig);
                setSnackbar({
                    open: true,
                    message: 'Configuration imported successfully!',
                    severity: 'success',
                });
            } catch (error) {
                console.error('Import error:', error);
                setSnackbar({
                    open: true,
                    message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: 'error',
                });
            }

            // Reset the input so the same file can be imported again
            event.target.value = '';
        },
        [onImport, parseConfig]
    );

    const handleSnackbarClose = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    const handlePasteFromFactorio = useCallback(async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            
            // Try to parse as JSON
            let parsed: unknown;
            try {
                parsed = JSON.parse(clipboardText);
            } catch {
                throw new Error('Clipboard does not contain valid JSON. Make sure to copy from the Factorio mod.');
            }

            // Check if it's the new format with machines and drills
            if (typeof parsed === 'object' && parsed !== null && 'machines' in parsed) {
                const data = parsed as { 
                    machines?: unknown[]; 
                    drills?: { mining_productivity_level?: number; configs?: unknown[] } | unknown[]; 
                    inserters?: unknown[]; 
                    belts?: unknown[];
                    chests?: unknown[];
                };
                
                const machineCount = Array.isArray(data.machines) ? data.machines.length : 0;
                // Handle new drills format: { mining_productivity_level, configs: [...] }
                const drillsData = data.drills;
                const drillConfigs = drillsData && typeof drillsData === 'object' && !Array.isArray(drillsData) && 'configs' in drillsData
                    ? (drillsData.configs as unknown[])
                    : (Array.isArray(drillsData) ? drillsData : []);
                const miningProductivityLevel = drillsData && typeof drillsData === 'object' && !Array.isArray(drillsData) && 'mining_productivity_level' in drillsData
                    ? (drillsData.mining_productivity_level as number)
                    : undefined;
                const drillCount = Array.isArray(drillConfigs) ? drillConfigs.length : 0;
                const inserterCount = Array.isArray(data.inserters) ? data.inserters.length : 0;
                const beltCount = Array.isArray(data.belts) ? data.belts.length : 0;
                const chestCount = Array.isArray(data.chests) ? data.chests.length : 0;
                
                if (machineCount === 0 && drillCount === 0 && inserterCount === 0 && beltCount === 0 && chestCount === 0) {
                    throw new Error('No machines, drills, inserters, belts, or chests found in clipboard data.');
                }

                // Validate machines (IDs are already assigned by the mod)
                const validatedMachines: MachineConfiguration[] = [];
                if (Array.isArray(data.machines)) {
                    for (let i = 0; i < data.machines.length; i++) {
                        const entry = data.machines[i];
                        const result = MachineConfigurationSchema.safeParse(entry);
                        if (!result.success) {
                            throw new Error(`Invalid machine at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                        }
                        validatedMachines.push(result.data);
                    }
                }

                // Validate drills (IDs are already assigned by the mod)
                const validatedDrills: MiningDrillConfiguration[] = [];
                if (Array.isArray(drillConfigs)) {
                    for (let i = 0; i < drillConfigs.length; i++) {
                        const entry = drillConfigs[i];
                        const result = MiningDrillConfigSchema.safeParse(entry);
                        if (!result.success) {
                            throw new Error(`Invalid drill at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                        }
                        validatedDrills.push(result.data);
                    }
                }

                // Validate inserters
                const validatedInserters: InserterConfiguration[] = [];
                if (Array.isArray(data.inserters)) {
                    for (let i = 0; i < data.inserters.length; i++) {
                        const entry = data.inserters[i];
                        const result = InserterConfigSchema.safeParse(entry);
                        if (!result.success) {
                            throw new Error(`Invalid inserter at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                        }
                        validatedInserters.push(result.data);
                    }
                }

                // Validate belts
                const validatedBelts: BeltConfiguration[] = [];
                if (Array.isArray(data.belts)) {
                    for (let i = 0; i < data.belts.length; i++) {
                        const entry = data.belts[i];
                        const result = BeltConfigSchema.safeParse(entry);
                        if (!result.success) {
                            throw new Error(`Invalid belt at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                        }
                        validatedBelts.push(result.data);
                    }
                }

                // Validate chests
                const validatedChests: ChestConfiguration[] = [];
                if (Array.isArray(data.chests)) {
                    for (let i = 0; i < data.chests.length; i++) {
                        const entry = data.chests[i];
                        const result = ChestConfigSchema.safeParse(entry);
                        if (!result.success) {
                            throw new Error(`Invalid chest at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                        }
                        validatedChests.push(result.data);
                    }
                }

                if (validatedMachines.length > 0) {
                    onReplaceMachines(validatedMachines);
                }
                if (validatedDrills.length > 0) {
                    onReplaceDrills(validatedDrills);
                }
                // Update mining productivity level if provided
                if (miningProductivityLevel !== undefined) {
                    onUpdateMiningProductivityLevel(miningProductivityLevel);
                }
                if (validatedInserters.length > 0) {
                    onReplaceInserters(validatedInserters);
                }
                if (validatedBelts.length > 0) {
                    onReplaceBelts(validatedBelts);
                }
                if (validatedChests.length > 0) {
                    onReplaceChests(validatedChests);
                }

                const parts: string[] = [];
                if (validatedMachines.length > 0) parts.push(`${validatedMachines.length} machines`);
                if (validatedDrills.length > 0) parts.push(`${validatedDrills.length} drills`);
                if (validatedInserters.length > 0) parts.push(`${validatedInserters.length} inserters`);
                if (validatedBelts.length > 0) parts.push(`${validatedBelts.length} belts`);
                if (validatedChests.length > 0) parts.push(`${validatedChests.length} chests`);
                
                setSnackbar({
                    open: true,
                    message: `Replaced with ${parts.join(' and ')} from Factorio!`,
                    severity: 'success',
                });
                return;
            }

            // Legacy format: array of machines
            if (!Array.isArray(parsed)) {
                throw new Error('Expected machines/drills object or array from Factorio mod.');
            }

            if (parsed.length === 0) {
                throw new Error('No machines found in clipboard data.');
            }

            // Validate each machine entry (IDs are already assigned by the mod)
            const validatedMachines: MachineConfiguration[] = [];
            
            for (let i = 0; i < parsed.length; i++) {
                const entry = parsed[i];
                const result = MachineConfigurationSchema.safeParse(entry);
                if (!result.success) {
                    throw new Error(`Invalid machine at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                }
                validatedMachines.push(result.data);
            }

            onReplaceMachines(validatedMachines);
            setSnackbar({
                open: true,
                message: `Replaced with ${validatedMachines.length} machines from Factorio!`,
                severity: 'success',
            });
        } catch (error) {
            console.error('Paste from Factorio error:', error);
            setSnackbar({
                open: true,
                message: `Failed to paste: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error',
            });
        }
    }, [onReplaceMachines, onReplaceDrills, onReplaceInserters, onReplaceBelts, onUpdateMiningProductivityLevel]);

    return (
        <>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    startIcon={<Upload />}
                    onClick={handleImportClick}
                    variant="outlined"
                    size="small"
                >
                    Import Config
                </Button>
                <Button
                    startIcon={<Download />}
                    onClick={handleExport}
                    variant="outlined"
                    size="small"
                >
                    Export Config
                </Button>
                <Tooltip title="Paste machines copied from the Crafting Speed Extractor Factorio mod">
                    <Button
                        startIcon={<ContentPaste />}
                        onClick={handlePasteFromFactorio}
                        variant="outlined"
                        size="small"
                        color="secondary"
                    >
                        Paste from Factorio
                    </Button>
                </Tooltip>
            </Box>

            <input
                ref={fileInputRef}
                type="file"
                accept=".json,.conf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
