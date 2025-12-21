import { Download, Upload } from '@mui/icons-material';
import { Box, Button, Snackbar, Alert } from '@mui/material';
import { useRef, useState, useCallback } from 'react';
import type { Config } from 'clock-generator/browser';

interface ConfigImportExportProps {
    config: Config;
    onImport: (config: Config) => void;
    parseConfig: (content: string) => Promise<Config>;
}

export function ConfigImportExport({
    config,
    onImport,
    parseConfig,
}: ConfigImportExportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    const handleExport = useCallback(() => {
        const jsonString = JSON.stringify(config, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clock-config-${Date.now()}.json`;
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
