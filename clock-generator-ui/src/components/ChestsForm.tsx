import { Add, Delete } from '@mui/icons-material';
import {
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import type { ChestFormData, InfinityFilterFormData } from '../hooks/useConfigForm';
import { isBufferChest, isInfinityChest } from '../hooks/useConfigForm';
import { ItemSelector } from './ItemSelector';

interface ChestsFormProps {
    chests: ChestFormData[];
    itemNames: string[];
    onAdd: (chestType?: 'buffer-chest' | 'infinity-chest') => void;
    onUpdate: (index: number, updates: Partial<ChestFormData>) => void;
    onSwitchType: (index: number, newType: 'buffer-chest' | 'infinity-chest') => void;
    onRemove: (index: number) => void;
}

export function ChestsForm({
    chests,
    itemNames,
    onAdd,
    onUpdate,
    onSwitchType,
    onRemove,
}: ChestsFormProps) {
    // Helper to update a specific filter in an infinity chest
    const updateInfinityFilter = (
        chestIndex: number,
        filterIndex: number,
        updates: Partial<InfinityFilterFormData>
    ) => {
        const chest = chests[chestIndex];
        if (!isInfinityChest(chest)) return;
        
        const newFilters = chest.item_filter.map((f, i) =>
            i === filterIndex ? { ...f, ...updates } : f
        );
        onUpdate(chestIndex, { item_filter: newFilters });
    };

    // Helper to add a filter to an infinity chest
    const addInfinityFilter = (chestIndex: number) => {
        const chest = chests[chestIndex];
        if (!isInfinityChest(chest)) return;
        
        onUpdate(chestIndex, {
            item_filter: [...chest.item_filter, { item_name: '', request_count: 1 }],
        });
    };

    // Helper to remove a filter from an infinity chest
    const removeInfinityFilter = (chestIndex: number, filterIndex: number) => {
        const chest = chests[chestIndex];
        if (!isInfinityChest(chest)) return;
        
        // Don't allow removing the last filter
        if (chest.item_filter.length <= 1) return;
        
        onUpdate(chestIndex, {
            item_filter: chest.item_filter.filter((_, i) => i !== filterIndex),
        });
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Chests ({chests.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<Add />} onClick={() => onAdd('buffer-chest')} variant="text" size="small">
                        Buffer Chest
                    </Button>
                    <Button startIcon={<Add />} onClick={() => onAdd('infinity-chest')} variant="text" size="small">
                        Infinity Chest
                    </Button>
                </Box>
            </Box>

            {chests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No chests configured. Buffer chests provide intermediate storage. Infinity chests provide unlimited item sources.
                </Typography>
            )}

            {chests.map((chest, index) => (
                <Box
                    key={`chest-\${index}`}
                    sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                    }}
                >
                    {/* Header row with ID, Type, and Delete */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <TextField
                            label="ID"
                            type="number"
                            value={chest.id}
                            onChange={(e) => onUpdate(index, { id: parseInt(e.target.value) || 1 })}
                            inputProps={{ min: 1 }}
                            sx={{ width: 80 }}
                            size="small"
                        />
                        
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={chest.type}
                                label="Type"
                                onChange={(e) => onSwitchType(index, e.target.value as 'buffer-chest' | 'infinity-chest')}
                            >
                                <MenuItem value="buffer-chest">Buffer Chest</MenuItem>
                                <MenuItem value="infinity-chest">Infinity Chest</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ flex: 1 }} />

                        <IconButton onClick={() => onRemove(index)} color="error">
                            <Delete />
                        </IconButton>
                    </Box>

                    {/* Buffer Chest fields */}
                    {isBufferChest(chest) && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <TextField
                                label="Storage Size"
                                type="number"
                                value={chest.storage_size}
                                onChange={(e) => onUpdate(index, { storage_size: parseInt(e.target.value) || 1 })}
                                inputProps={{ min: 1 }}
                                sx={{ width: 130 }}
                                size="small"
                            />

                            <ItemSelector
                                value={chest.item_filter || null}
                                options={itemNames}
                                onChange={(newValue) => onUpdate(index, { item_filter: newValue || '' })}
                                label="Item Filter"
                                size="small"
                                minWidth={300}
                            />
                        </Box>
                    )}

                    {/* Infinity Chest fields */}
                    {isInfinityChest(chest) && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Item Filters ({chest.item_filter.length})
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => addInfinityFilter(index)}
                                >
                                    Add Filter
                                </Button>
                            </Box>

                            {chest.item_filter.map((filter, filterIndex) => (
                                <Box
                                    key={`filter-\${filterIndex}`}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        alignItems: 'center',
                                        mb: 1,
                                        p: 1,
                                        bgcolor: 'background.paper',
                                        borderRadius: 1,
                                    }}
                                >
                                    <ItemSelector
                                        value={filter.item_name || null}
                                        options={itemNames}
                                        onChange={(newValue) =>
                                            updateInfinityFilter(index, filterIndex, { item_name: newValue || '' })
                                        }
                                        label="Item"
                                        size="small"
                                        minWidth={200}
                                        sx={{ flex: 1 }}
                                    />

                                    <TextField
                                        label="Request Count"
                                        type="number"
                                        value={filter.request_count}
                                        onChange={(e) =>
                                            updateInfinityFilter(index, filterIndex, {
                                                request_count: parseInt(e.target.value) || 1,
                                            })
                                        }
                                        inputProps={{ min: 1 }}
                                        sx={{ width: 130 }}
                                        size="small"
                                    />

                                    <IconButton
                                        onClick={() => removeInfinityFilter(index, filterIndex)}
                                        color="error"
                                        size="small"
                                        disabled={chest.item_filter.length <= 1}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            ))}
        </Paper>
    );
}
