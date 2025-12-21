import { Add, Close, Delete } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    IconButton,
    Paper,
    Popover,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { BeltFormData, InserterFormData, MachineFormData } from '../hooks/useConfigForm';
import { FactorioIcon } from './FactorioIcon';

interface EntityOption {
    type: 'machine' | 'belt';
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
    itemNames: string[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<InserterFormData>) => void;
    onRemove: (index: number) => void;
}

export function InsertersForm({
    inserters,
    machines,
    belts,
    itemNames,
    onAdd,
    onUpdate,
    onRemove,
}: InsertersFormProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeSlot, setActiveSlot] = useState<{ inserterIndex: number; slotIndex: number } | null>(null);

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
        
        return options;
    }, [machines, belts]);

    // Find entity option by type and id
    const findEntityOption = (type: 'machine' | 'belt', id: number): EntityOption | undefined => {
        return entityOptions.find(opt => opt.type === type && opt.id === id);
    };

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

                    <Typography variant="body2" color="text.secondary">
                        →
                    </Typography>

                    {/* Sink */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            To:
                        </Typography>
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
