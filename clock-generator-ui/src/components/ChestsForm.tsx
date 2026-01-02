import { Add, Delete } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    IconButton,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import type { ChestFormData } from '../hooks/useConfigForm';
import { FactorioIcon } from './FactorioIcon';

interface ChestsFormProps {
    chests: ChestFormData[];
    itemNames: string[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<ChestFormData>) => void;
    onRemove: (index: number) => void;
}

export function ChestsForm({
    chests,
    itemNames,
    onAdd,
    onUpdate,
    onRemove,
}: ChestsFormProps) {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Buffer Chests ({chests.length})
                </Typography>
                <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
                    Add Chest
                </Button>
            </Box>

            {chests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No buffer chests configured. Chests can be used as intermediate storage between inserters.
                </Typography>
            )}

            {chests.map((chest, index) => (
                <Box
                    key={`chest-${index}`}
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
                    <TextField
                        label="ID"
                        type="number"
                        value={chest.id}
                        onChange={(e) => onUpdate(index, { id: parseInt(e.target.value) || 1 })}
                        inputProps={{ min: 1 }}
                        sx={{ width: 80 }}
                        size="small"
                    />
                    
                    <TextField
                        label="Storage Size"
                        type="number"
                        value={chest.storage_size}
                        onChange={(e) => onUpdate(index, { storage_size: parseInt(e.target.value) || 1 })}
                        inputProps={{ min: 1 }}
                        sx={{ width: 130 }}
                        size="small"
                    />

                    <Autocomplete
                        size="small"
                        sx={{ minWidth: 200 }}
                        options={itemNames}
                        value={chest.item_filter || null}
                        onChange={(_, newValue) => onUpdate(index, { item_filter: newValue || '' })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Item Filter"
                                slotProps={{
                                    input: {
                                        ...params.InputProps,
                                        startAdornment: chest.item_filter ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                                <FactorioIcon name={chest.item_filter} size={20} />
                                            </Box>
                                        ) : null,
                                    },
                                }}
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

                    <Box sx={{ flex: 1 }} />

                    <IconButton onClick={() => onRemove(index)} color="error">
                        <Delete />
                    </IconButton>
                </Box>
            ))}
        </Paper>
    );
}
