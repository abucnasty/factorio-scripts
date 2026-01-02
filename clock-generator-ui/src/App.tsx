import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AppBar,
    Box,
    Button,
    CircularProgress,
    Container,
    CssBaseline,
    ThemeProvider,
    Toolbar,
    Tooltip,
    Typography,
    createTheme,
    Alert,
    Divider,
    Icon,
} from '@mui/material';
import type { Config, DebugSteps } from 'clock-generator/browser';
import { useSimulationWorker } from './hooks/useSimulationWorker';
import { useConfigForm } from './hooks/useConfigForm';
import { TargetOutputForm } from './components/TargetOutputForm';
import { MachinesForm } from './components/MachinesForm';
import { InsertersForm } from './components/InsertersForm';
import { BeltsForm } from './components/BeltsForm';
import { ChestsForm } from './components/ChestsForm';
import { DrillsForm } from './components/DrillsForm';
import { OverridesForm } from './components/OverridesForm';
import { ConfigImportExport } from './components/ConfigImportExport';
import { BlueprintOutput } from './components/BlueprintOutput';
import { DebugPanel } from './components/DebugPanel';
import { TransferHistoryVisualization } from './components/TransferHistoryVisualization';
import { StateTransitionTimeline } from './components/StateTransitionTimeline';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#ff9800', // Factorio orange
        },
        secondary: {
            main: '#4caf50',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
    },
});

// Simple HOCON parsing fallback - in real scenario use the browser config loader
async function parseConfig(content: string): Promise<Config> {
    // Try JSON first
    try {
        return JSON.parse(content);
    } catch {
        // For HOCON, we'd need to use the createBrowserConfigLoader
        // For now, just throw an error suggesting JSON
        throw new Error('HOCON parsing not yet implemented in browser. Please use JSON format.');
    }
}

function App() {
    const {
        isInitialized,
        isRunning,
        recipeNames,
        resourceNames,
        logs,
        blueprintString,
        transferHistory,
        stateTransitionHistory,
        simulationDurationTicks,
        error,
        initialize,
        runSimulation,
        clearLogs,
        getRecipeInfo,
    } = useSimulationWorker();

    const {
        config,
        updateTargetOutput,
        addMachine,
        updateMachine,
        removeMachine,
        addInserter,
        updateInserter,
        removeInserter,
        addBelt,
        updateBelt,
        removeBelt,
        addChest,
        updateChest,
        removeChest,
        enableDrills,
        disableDrills,
        updateDrillsConfig,
        addDrill,
        updateDrill,
        removeDrill,
        updateOverrides,
        importConfig,
        exportConfig,
        resetConfig,
    } = useConfigForm();

    const [debugSteps, setDebugSteps] = useState<DebugSteps>({
        prepare: false,
        warm_up: false,
        simulate: false,
    });

    // Initialize worker on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Extract IDs for dropdown population
    const machineIds = useMemo(() => config.machines.map((m) => m.id), [config.machines]);

    // All item names (from recipes and resources)
    const itemNames = useMemo(() => {
        const names = new Set<string>();
        recipeNames.forEach((name) => names.add(name));
        resourceNames.forEach((name) => names.add(name));
        return Array.from(names).sort();
    }, [recipeNames, resourceNames]);

    const handleGenerate = useCallback(() => {
        const configToRun = exportConfig();
        runSimulation(configToRun, debugSteps);
    }, [exportConfig, runSimulation, debugSteps]);

    const handleImportConfig = useCallback((imported: Config) => {
        importConfig(imported);
    }, [importConfig]);

    // Check if config is valid enough to generate
    const canGenerate = useMemo(() => {
        return (
            isInitialized &&
            !isRunning &&
            config.target_output.recipe &&
            config.target_output.items_per_second > 0 &&
            config.target_output.copies > 0 &&
            config.machines.length > 0 &&
            config.machines.every((m) => m.recipe)
        );
    }, [isInitialized, isRunning, config]);

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <AppBar position="fixed">
                    <Toolbar>
                        <Icon sx={{ mr: 3 }}>
                            <img src="/big_biter_q5_right.png" alt="Logo" style={{ width: 26, height: 26 }} />
                        </Icon>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Factorio Clock Generator
                        </Typography>
                        <ConfigImportExport
                            config={exportConfig()}
                            onImport={handleImportConfig}
                            parseConfig={parseConfig}
                        />
                        <Tooltip title="Reset all configuration to defaults">
                            <Button
                                color="inherit"
                                onClick={resetConfig}
                                sx={{ ml: 1 }}
                            >
                                Reset
                            </Button>
                        </Tooltip>
                    </Toolbar>
                </AppBar>
                {/* Spacer to account for fixed AppBar */}
                <Toolbar />

                <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
                    {!isInitialized ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>Loading Factorio data...</Typography>
                        </Box>
                    ) : (
                        <>
                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <TargetOutputForm
                                recipe={config.target_output.recipe}
                                itemsPerSecond={config.target_output.items_per_second}
                                copies={config.target_output.copies}
                                recipeNames={recipeNames}
                                onRecipeChange={(recipe) => updateTargetOutput('recipe', recipe)}
                                onItemsPerSecondChange={(value) => updateTargetOutput('items_per_second', value)}
                                onCopiesChange={(value) => updateTargetOutput('copies', value)}
                            />

                            <MachinesForm
                                machines={config.machines}
                                recipeNames={recipeNames}
                                onAdd={addMachine}
                                onUpdate={updateMachine}
                                onRemove={removeMachine}
                            />

                            <InsertersForm
                                inserters={config.inserters}
                                machines={config.machines}
                                belts={config.belts}
                                chests={config.chests}
                                itemNames={itemNames}
                                getRecipeInfo={getRecipeInfo}
                                onAdd={addInserter}
                                onUpdate={updateInserter}
                                onRemove={removeInserter}
                            />

                            <BeltsForm
                                belts={config.belts}
                                itemNames={itemNames}
                                onAdd={addBelt}
                                onUpdate={updateBelt}
                                onRemove={removeBelt}
                            />

                            <ChestsForm
                                chests={config.chests}
                                itemNames={itemNames}
                                onAdd={addChest}
                                onUpdate={updateChest}
                                onRemove={removeChest}
                            />

                            <Box sx={{ mb: 2 }}>
                                <DrillsForm
                                    enabled={!!config.drills}
                                    miningProductivityLevel={config.drills?.mining_productivity_level ?? 0}
                                    drills={config.drills?.configs ?? []}
                                    resourceNames={resourceNames}
                                    machineIds={machineIds}
                                    onEnable={enableDrills}
                                    onDisable={disableDrills}
                                    onUpdateProductivityLevel={(value) => updateDrillsConfig('mining_productivity_level', value)}
                                    onAdd={addDrill}
                                    onUpdate={updateDrill}
                                    onRemove={removeDrill}
                                />
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <OverridesForm
                                    lcm={config.overrides?.lcm}
                                    terminalSwingCount={config.overrides?.terminal_swing_count}
                                    onUpdate={updateOverrides}
                                />
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <BlueprintOutput
                                blueprintString={blueprintString}
                                isLoading={isRunning}
                                error={error}
                                simulationDurationTicks={simulationDurationTicks ?? undefined}
                                onGenerate={handleGenerate}
                                disabled={!canGenerate}
                            />

                            {transferHistory && (
                                <Box sx={{ mt: 2 }}>
                                    <TransferHistoryVisualization transferHistory={transferHistory} />
                                </Box>
                            )}

                            {stateTransitionHistory && (
                                <Box sx={{ mt: 2 }}>
                                    <StateTransitionTimeline stateTransitionHistory={stateTransitionHistory} />
                                </Box>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <DebugPanel
                                    logs={logs}
                                    debugSteps={debugSteps}
                                    onDebugStepsChange={setDebugSteps}
                                    onClearLogs={clearLogs}
                                />
                            </Box>
                        </>
                    )}
                </Container>

                <Box
                    component="footer"
                    sx={{
                        py: 2,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                        borderTop: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        Factorio Clock Generator UI - Generate clock circuits for your factory setups
                    </Typography>
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;
