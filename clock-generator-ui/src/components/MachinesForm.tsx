import { Add, Delete } from '@mui/icons-material';
import {
    Autocomplete,
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
import type { MachineFormData } from '../hooks/useConfigForm';

interface MachinesFormProps {
    machines: MachineFormData[];
    recipeNames: string[];
    onAdd: () => void;
    onUpdate: (index: number, field: keyof MachineFormData, value: string | number) => void;
    onRemove: (index: number) => void;
}

export function MachinesForm({
    machines,
    recipeNames,
    onAdd,
    onUpdate,
    onRemove,
}: MachinesFormProps) {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Machines ({machines.length})
                </Typography>
                <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
                    Add Machine
                </Button>
            </Box>

            {machines.map((machine, index) => (
                <Box
                    key={`machine-${index}`}
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
                        value={machine.id}
                        onChange={(e) => onUpdate(index, 'id', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 80 }}
                        size="small"
                    />
                    <Autocomplete
                        sx={{ minWidth: 250, flex: 1 }}
                        options={recipeNames}
                        value={machine.recipe || null}
                        onChange={(_, newValue) => onUpdate(index, 'recipe', newValue || '')}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Recipe"
                                placeholder="Search recipes..."
                                size="small"
                            />
                        )}
                        freeSolo
                        autoHighlight
                    />
                    <TextField
                        label="Productivity (%)"
                        type="number"
                        value={machine.productivity}
                        onChange={(e) => onUpdate(index, 'productivity', parseFloat(e.target.value) || 0)}
                        inputProps={{ step: 1, min: 0 }}
                        sx={{ width: 130 }}
                        size="small"
                    />
                    <TextField
                        label="Crafting Speed"
                        type="number"
                        value={machine.crafting_speed}
                        onChange={(e) => onUpdate(index, 'crafting_speed', parseFloat(e.target.value) || 1)}
                        inputProps={{ step: 0.1, min: 0 }}
                        sx={{ width: 130 }}
                        size="small"
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={machine.type || 'machine'}
                            label="Type"
                            onChange={(e) => onUpdate(index, 'type', e.target.value as 'machine' | 'furnace')}
                        >
                            <MenuItem value="machine">Machine</MenuItem>
                            <MenuItem value="furnace">Furnace</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton
                        onClick={() => onRemove(index)}
                        color="error"
                        disabled={machines.length <= 1}
                    >
                        <Delete />
                    </IconButton>
                </Box>
            ))}
        </Paper>
    );
}
