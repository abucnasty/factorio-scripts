import { Add, Delete } from '@mui/icons-material';
import {
    Box,
    Button,
    IconButton,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import type { ChestFormData } from '../hooks/useConfigForm';
import { ItemSelector } from './ItemSelector';

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
                <Button startIcon={<Add />} onClick={onAdd} variant="text" size="small">
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

                    <ItemSelector
                        value={chest.item_filter || null}
                        options={itemNames}
                        onChange={(newValue) => onUpdate(index, { item_filter: newValue || '' })}
                        label="Item Filter"
                        size="small"
                        minWidth={300}
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
