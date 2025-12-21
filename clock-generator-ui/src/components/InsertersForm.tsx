import { Add, Close, Delete } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import type { InserterFormData } from '../hooks/useConfigForm';
import { FactorioIcon } from './FactorioIcon';

interface InsertersFormProps {
    inserters: InserterFormData[];
    machineIds: number[];
    beltIds: number[];
    itemNames: string[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<InserterFormData>) => void;
    onRemove: (index: number) => void;
}

export function InsertersForm({
    inserters,
    machineIds,
    beltIds,
    itemNames,
    onAdd,
    onUpdate,
    onRemove,
}: InsertersFormProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeSlot, setActiveSlot] = useState<{ inserterIndex: number; slotIndex: number } | null>(null);

    const handleSlotClick = (event: React.MouseEvent<HTMLElement>, inserterIndex: number, slotIndex: number) => {
        setAnchorEl(event.currentTarget);
        setActiveSlot({ inserterIndex, slotIndex });
    };

    const handleClose = () => {
        setAnchorEl(null);
        setActiveSlot(null);
    };

    const handleItemSelect = (item: string) => {
        if (activeSlot) {
            const inserter = inserters[activeSlot.inserterIndex];
            const filters = [...(inserter.filters || [])];
            filters[activeSlot.slotIndex] = item;
            // Remove empty trailing slots
            while (filters.length > 0 && !filters[filters.length - 1]) {
                filters.pop();
            }
            onUpdate(activeSlot.inserterIndex, { filters: filters.length > 0 ? filters : undefined });
        }
        handleClose();
    };

    const handleRemoveFilter = (inserterIndex: number, slotIndex: number) => {
        const inserter = inserters[inserterIndex];
        const filters = [...(inserter.filters || [])];
        filters.splice(slotIndex, 1);
        onUpdate(inserterIndex, { filters: filters.length > 0 ? filters : undefined });
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Inserters ({inserters.length})
                </Typography>
                <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
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
                        <Typography variant="body2" color="text.secondary">
                            From:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={inserter.source.type}
                                label="Type"
                                onChange={(e) =>
                                    onUpdate(index, {
                                        source: {
                                            type: e.target.value as 'machine' | 'belt',
                                            id: inserter.source.id,
                                        },
                                    })
                                }
                            >
                                <MenuItem value="machine">Machine</MenuItem>
                                <MenuItem value="belt">Belt</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <InputLabel>ID</InputLabel>
                            <Select
                                value={inserter.source.id}
                                label="ID"
                                onChange={(e) =>
                                    onUpdate(index, {
                                        source: {
                                            type: inserter.source.type,
                                            id: e.target.value as number,
                                        },
                                    })
                                }
                            >
                                {(inserter.source.type === 'machine' ? machineIds : beltIds).map((id) => (
                                    <MenuItem key={id} value={id}>
                                        {id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                        →
                    </Typography>

                    {/* Sink */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            To:
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={inserter.sink.type}
                                label="Type"
                                onChange={(e) =>
                                    onUpdate(index, {
                                        sink: {
                                            type: e.target.value as 'machine' | 'belt',
                                            id: inserter.sink.id,
                                        },
                                    })
                                }
                            >
                                <MenuItem value="machine">Machine</MenuItem>
                                <MenuItem value="belt">Belt</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <InputLabel>ID</InputLabel>
                            <Select
                                value={inserter.sink.id}
                                label="ID"
                                onChange={(e) =>
                                    onUpdate(index, {
                                        sink: {
                                            type: inserter.sink.type,
                                            id: e.target.value as number,
                                        },
                                    })
                                }
                            >
                                {(inserter.sink.type === 'machine' ? machineIds : beltIds).map((id) => (
                                    <MenuItem key={id} value={id}>
                                        {id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
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
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Filters:
                        </Typography>
                        {[0, 1, 2, 3, 4].map((slotIndex) => {
                            const filterItem = inserter.filters?.[slotIndex];
                            return (
                                <Box
                                    key={slotIndex}
                                    onClick={(e) => handleSlotClick(e, index, slotIndex)}
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        border: '2px solid',
                                        borderColor: filterItem ? 'primary.main' : 'divider',
                                        borderRadius: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        bgcolor: 'background.paper',
                                        position: 'relative',
                                        '&:hover': {
                                            borderColor: 'primary.light',
                                            bgcolor: 'action.hover',
                                        },
                                    }}
                                >
                                    {filterItem ? (
                                        <>
                                            <FactorioIcon name={filterItem} size={28} />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFilter(index, slotIndex);
                                                }}
                                                sx={{
                                                    position: 'absolute',
                                                    top: -8,
                                                    right: -8,
                                                    width: 16,
                                                    height: 16,
                                                    bgcolor: 'error.main',
                                                    '&:hover': { bgcolor: 'error.dark' },
                                                }}
                                            >
                                                <Close sx={{ fontSize: 12, color: 'white' }} />
                                            </IconButton>
                                        </>
                                    ) : (
                                        <Add sx={{ fontSize: 16, color: 'text.disabled' }} />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>

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

            {/* Item Selection Popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2, width: 300 }}>
                    <Autocomplete
                        options={itemNames}
                        autoFocus
                        openOnFocus
                        onChange={(_, newValue) => {
                            if (newValue) {
                                handleItemSelect(newValue);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Item"
                                placeholder="Search items..."
                                size="small"
                                autoFocus
                            />
                        )}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            return (
                                <Box
                                    component="li"
                                    key={key}
                                    {...rest}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                    <FactorioIcon name={option} size={20} />
                                    {option}
                                </Box>
                            );
                        }}
                        autoHighlight
                    />
                </Box>
            </Popover>
        </Paper>
    );
}
