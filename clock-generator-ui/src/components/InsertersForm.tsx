import { Add, Delete, Settings } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    IconButton,
    Paper,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { BeltFormData, ChestFormData, EnableControlOverride, InserterFormData, MachineFormData } from '../hooks/useConfigForm';
import { EnableControlModal } from './EnableControlModal';
import type { RecipeInfo } from '../hooks/useSimulationWorker';
import { FactorioIcon } from './FactorioIcon';
import { FilterSlotSelector } from './FilterSlotSelector';

interface EntityOption {
    type: 'machine' | 'belt' | 'chest';
    id: number;
    label: string;
    icon: string;
    sublabel?: string;
    ingredientIcons?: string[]; // For belts: ingredient icons to display
}

interface InsertersFormProps {
    inserters: InserterFormData[];
    machines: MachineFormData[];
    belts: BeltFormData[];
    chests: ChestFormData[];
    itemNames: string[];
    getRecipeInfo: (recipeName: string) => RecipeInfo | null;
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<InserterFormData>) => void;
    onRemove: (index: number) => void;
}

export function InsertersForm({
    inserters,
    machines,
    belts,
    chests,
    itemNames,
    getRecipeInfo,
    onAdd,
    onUpdate,
    onRemove,
}: InsertersFormProps) {
    const [enableControlModalInserterIndex, setEnableControlModalInserterIndex] = useState<number | null>(null);

    // Build entity options for the dropdown
    const entityOptions = useMemo<EntityOption[]>(() => {
        const options: EntityOption[] = [];

        // Add machines
        machines.forEach((machine) => {
            options.push({
                type: 'machine',
                id: machine.id,
                label: `Machine ${machine.id}`,
                icon: machine.recipe || 'assembling-machine-3',
                sublabel: machine.recipe || 'No recipe',
            });
        });

        // Add belts
        belts.forEach((belt) => {
            const ingredientIcons = belt.lanes.map(lane => lane.ingredient).filter(Boolean);
            options.push({
                type: 'belt',
                id: belt.id,
                label: `Belt ${belt.id}`,
                icon: belt.type,
                ingredientIcons: ingredientIcons.length > 0 ? ingredientIcons : undefined,
            });
        });

        // Add chests
        chests.forEach((chest) => {
            options.push({
                type: 'chest',
                id: chest.id,
                label: `Chest ${chest.id}`,
                icon: 'iron-chest',
                sublabel: chest.item_filter || 'No item filter',
                ingredientIcons: chest.item_filter ? [chest.item_filter] : undefined,
            });
        });

        return options;
    }, [machines, belts, chests]);

    // Find entity option by type and id
    const findEntityOption = (type: 'machine' | 'belt' | 'chest', id: number): EntityOption | undefined => {
        return entityOptions.find(opt => opt.type === type && opt.id === id);
    };

    // Compute inferred filters when explicit filters are not set
    const getInferredFilters = (inserter: InserterFormData): string[] => {
        // Get source items (what the source can provide)
        let sourceItems: string[] = [];
        if (inserter.source.type === 'machine') {
            const machine = machines.find(m => m.id === inserter.source.id);
            if (machine?.recipe) {
                const recipeInfo = getRecipeInfo(machine.recipe);
                if (recipeInfo) {
                    sourceItems = recipeInfo.results; // Machine outputs its recipe results
                }
            }
        } else if (inserter.source.type === 'belt') {
            // Belt source - get ingredients from lanes
            const belt = belts.find(b => b.id === inserter.source.id);
            if (belt) {
                sourceItems = belt.lanes.map(lane => lane.ingredient).filter(Boolean);
            }
        } else if (inserter.source.type === 'chest') {
            // Chest source - get item filter
            const chest = chests.find(c => c.id === inserter.source.id);
            if (chest?.item_filter) {
                sourceItems = [chest.item_filter];
            }
        }

        // Get sink requirements (what the sink needs)
        let sinkNeeds: string[] = [];
        if (inserter.sink.type === 'machine') {
            const machine = machines.find(m => m.id === inserter.sink.id);
            if (machine?.recipe) {
                const recipeInfo = getRecipeInfo(machine.recipe);
                if (recipeInfo) {
                    sinkNeeds = recipeInfo.ingredients; // Machine needs its recipe ingredients
                }
            }
        } else if (inserter.sink.type === 'belt') {
            // Belt sink - accept anything from source
            sinkNeeds = sourceItems;
        } else if (inserter.sink.type === 'chest') {
            // Chest sink - only accepts its item filter
            const chest = chests.find(c => c.id === inserter.sink.id);
            if (chest?.item_filter) {
                sinkNeeds = [chest.item_filter];
            } else {
                sinkNeeds = sourceItems;
            }
        }

        // Return intersection of source items and sink needs
        if (sinkNeeds.length === 0) {
            return sourceItems;
        }
        return sourceItems.filter(item => sinkNeeds.includes(item));
    };

    const handleFilterChange = (inserterIndex: number, slotIndex: number, item: string) => {
        const inserter = inserters[inserterIndex];
        const filters = [...(inserter.filters || [])];
        filters[slotIndex] = item;
        // Remove empty trailing slots
        while (filters.length > 0 && !filters[filters.length - 1]) {
            filters.pop();
        }
        onUpdate(inserterIndex, { filters: filters.length > 0 ? filters : undefined });
    };

    const handleRemoveFilter = (inserterIndex: number, slotIndex: number) => {
        const inserter = inserters[inserterIndex];
        let filters = [...(inserter.filters || [])];
        
        // If removing an auto-assigned filter (no explicit filters exist), convert all to explicit first
        if (filters.length === 0) {
            const inferredFilters = getInferredFilters(inserter);
            filters = [...inferredFilters];
        }
        
        // Remove the specified slot
        filters.splice(slotIndex, 1);
        
        // Clean up empty trailing slots
        while (filters.length > 0 && !filters[filters.length - 1]) {
            filters.pop();
        }
        
        onUpdate(inserterIndex, { filters: filters.length > 0 ? filters : undefined });
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Inserters ({inserters.length})
                </Typography>
                <Button startIcon={<Add />} onClick={onAdd} variant="text" size="small">
                    Add Inserter
                </Button>
            </Box>

            {inserters.map((inserter, index) => (
                <Box
                    key={`inserter-${index}`}
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        mb: 2,
                        p: 2,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Source */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Autocomplete
                            size="small"
                            sx={{ minWidth: 250 }}
                            options={entityOptions}
                            value={findEntityOption(inserter.source.type, inserter.source.id)}
                            onChange={(_, newValue) => {
                                if (newValue) {
                                    onUpdate(index, {
                                        source: { type: newValue.type, id: newValue.id },
                                    });
                                }
                            }}
                            getOptionLabel={(option) => {
                                if (option.sublabel) return `${option.label} - ${option.sublabel}`;
                                if (option.ingredientIcons) return option.label;
                                return option.label;
                            }}
                            isOptionEqualToValue={(option, value) =>
                                option.type === value.type && option.id === value.id
                            }
                            renderInput={(params) => {
                                const selectedOption = findEntityOption(inserter.source.type, inserter.source.id);
                                return (
                                    <TextField
                                        {...params}
                                        label="Source"
                                        slotProps={{
                                            input: {
                                                ...params.InputProps,
                                                startAdornment: selectedOption ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                                        <FactorioIcon name={selectedOption.icon} size={20} />
                                                        {selectedOption.ingredientIcons && (
                                                            <>
                                                                <Typography variant="body2" sx={{ mx: 0.5 }}>:</Typography>
                                                                {selectedOption.ingredientIcons.map((ing, i) => (
                                                                    <FactorioIcon key={i} name={ing} size={18} />
                                                                ))}
                                                            </>
                                                        )}
                                                    </Box>
                                                ) : null,
                                            },
                                        }}
                                    />
                                );
                            }}
                            renderOption={(props, option) => {
                                const { key, ...rest } = props;
                                return (
                                    <Box
                                        component="li"
                                        key={key}
                                        {...rest}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                    >
                                        <FactorioIcon name={option.icon} size={24} />
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="body2">{option.label}</Typography>
                                            {option.sublabel ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.sublabel}
                                                </Typography>
                                            ) : option.ingredientIcons ? (
                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                    {option.ingredientIcons.map((ing, i) => (
                                                        <FactorioIcon key={i} name={ing} size={16} />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    No items
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            }}
                            autoHighlight
                            disableClearable
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            →
                        </Typography>
                    </Box>


                    {/* Sink */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Autocomplete
                            size="small"
                            sx={{ minWidth: 250 }}
                            options={entityOptions}
                            value={findEntityOption(inserter.sink.type, inserter.sink.id)}
                            onChange={(_, newValue) => {
                                if (newValue) {
                                    onUpdate(index, {
                                        sink: { type: newValue.type, id: newValue.id },
                                    });
                                }
                            }}
                            getOptionLabel={(option) => {
                                if (option.sublabel) return `${option.label} - ${option.sublabel}`;
                                if (option.ingredientIcons) return option.label;
                                return option.label;
                            }}
                            isOptionEqualToValue={(option, value) =>
                                option.type === value.type && option.id === value.id
                            }
                            renderInput={(params) => {
                                const selectedOption = findEntityOption(inserter.sink.type, inserter.sink.id);
                                return (
                                    <TextField
                                        {...params}
                                        label="Destination"
                                        slotProps={{
                                            input: {
                                                ...params.InputProps,
                                                startAdornment: selectedOption ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                                        <FactorioIcon name={selectedOption.icon} size={20} />
                                                        {selectedOption.ingredientIcons && (
                                                            <>
                                                                <Typography variant="body2" sx={{ mx: 0.5 }}>:</Typography>
                                                                {selectedOption.ingredientIcons.map((ing, i) => (
                                                                    <FactorioIcon key={i} name={ing} size={18} />
                                                                ))}
                                                            </>
                                                        )}
                                                    </Box>
                                                ) : null,
                                            },
                                        }}
                                    />
                                );
                            }}
                            renderOption={(props, option) => {
                                const { key, ...rest } = props;
                                return (
                                    <Box
                                        component="li"
                                        key={key}
                                        {...rest}
                                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                    >
                                        <FactorioIcon name={option.icon} size={24} />
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="body2">{option.label}</Typography>
                                            {option.sublabel ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.sublabel}
                                                </Typography>
                                            ) : option.ingredientIcons ? (
                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                    {option.ingredientIcons.map((ing, i) => (
                                                        <FactorioIcon key={i} name={ing} size={16} />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    No items
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            }}
                            autoHighlight
                            disableClearable
                        />
                    </Box>

                    <TextField
                        label="Stack Size"
                        type="number"
                        value={inserter.stack_size}
                        onChange={(e) =>
                            onUpdate(index, { stack_size: parseInt(e.target.value) || 16 })
                        }
                        inputProps={{ min: 1, max: 16 }}
                        sx={{ width: 100 }}
                        size="small"
                    />

                    {/* Item Filter Slots */}
                    <FilterSlotSelector
                        filters={inserter.filters}
                        inferredFilters={getInferredFilters(inserter)}
                        itemNames={itemNames}
                        onFilterChange={(slotIndex, item) => handleFilterChange(index, slotIndex, item)}
                        onRemoveFilter={(slotIndex) => handleRemoveFilter(index, slotIndex)}
                        maxSlots={5}
                    />

                    {/* Enable Control Settings */}
                    <Tooltip title="Configure Enable Control">
                        <IconButton
                            onClick={() => setEnableControlModalInserterIndex(index)}
                            color={inserter.overrides?.enable_control?.mode && inserter.overrides.enable_control.mode !== 'AUTO' ? 'primary' : 'default'}
                        >
                            <Settings />
                        </IconButton>
                    </Tooltip>

                    <IconButton onClick={() => onRemove(index)} color="error">
                        <Delete />
                    </IconButton>
                </Box>
            ))}

            {inserters.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No inserters configured. Add at least one inserter to transfer items.
                </Typography>
            )}

            {/* Enable Control Modal */}
            <EnableControlModal
                open={enableControlModalInserterIndex !== null}
                onClose={() => setEnableControlModalInserterIndex(null)}
                entityType="inserter"
                entityLabel={enableControlModalInserterIndex !== null ? `Inserter ${enableControlModalInserterIndex + 1}` : ''}
                currentOverride={enableControlModalInserterIndex !== null ? inserters[enableControlModalInserterIndex]?.overrides?.enable_control : undefined}
                onSave={(override: EnableControlOverride | undefined) => {
                    if (enableControlModalInserterIndex !== null) {
                        const inserter = inserters[enableControlModalInserterIndex];
                        onUpdate(enableControlModalInserterIndex, {
                            overrides: {
                                ...inserter.overrides,
                                enable_control: override,
                            },
                        });
                    }
                    setEnableControlModalInserterIndex(null);
                }}
            />
        </Paper>
    );
}
