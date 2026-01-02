import { Download, Upload, ContentPaste } from '@mui/icons-material';
import { Box, Button, Snackbar, Alert, Tooltip } from '@mui/material';
import { useRef, useState, useCallback } from 'react';
import type { Config } from 'clock-generator/browser';
import { MachineConfigurationSchema } from 'clock-generator/browser';
import type { z } from 'zod';

type MachineConfiguration = z.infer<typeof MachineConfigurationSchema>;

interface ConfigImportExportProps {
    config: Config;
    onImport: (config: Config) => void;
    onMergeMachines: (machines: MachineConfiguration[]) => void;
    parseConfig: (content: string) => Promise<Config>;
}

export function ConfigImportExport({
    config,
    onImport,
    onMergeMachines,
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
            
            // Try to parse as JSON array
            let parsed: unknown;
            try {
                parsed = JSON.parse(clipboardText);
            } catch {
                throw new Error('Clipboard does not contain valid JSON. Make sure to copy from the Factorio mod.');
            }

            // Validate it's an array
            if (!Array.isArray(parsed)) {
                throw new Error('Expected an array of machines from Factorio mod.');
            }

            if (parsed.length === 0) {
                throw new Error('No machines found in clipboard data.');
            }

            // Validate each machine entry
            const validatedMachines: MachineConfiguration[] = [];
            const existingMaxId = config.machines.reduce((max, m) => Math.max(max, m.id), 0);
            
            for (let i = 0; i < parsed.length; i++) {
                const entry = parsed[i];
                const result = MachineConfigurationSchema.safeParse(entry);
                if (!result.success) {
                    throw new Error(`Invalid machine at index ${i}: ${result.error.issues[0]?.message || 'Unknown error'}`);
                }
                // Reassign ID to avoid conflicts
                validatedMachines.push({
                    ...result.data,
                    id: existingMaxId + i + 1
                });
            }

            onMergeMachines(validatedMachines);
            setSnackbar({
                open: true,
                message: `Successfully imported ${validatedMachines.length} machines from Factorio!`,
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
    }, [config.machines, onMergeMachines]);

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
