import { Autocomplete, Box, Paper, TextField, Typography } from '@mui/material';
import { FactorioIcon } from './FactorioIcon';

interface TargetOutputFormProps {
    recipe: string;
    itemsPerSecond: number;
    machines: number;
    recipeNames: string[];
    onRecipeChange: (recipe: string) => void;
    onItemsPerSecondChange: (value: number) => void;
    onMachinesChange: (value: number) => void;
}

export function TargetOutputForm({
    recipe,
    itemsPerSecond,
    machines,
    recipeNames,
    onRecipeChange,
    onItemsPerSecondChange,
    onMachinesChange,
}: TargetOutputFormProps) {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Target Output
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Autocomplete
                    sx={{ minWidth: 300, flex: 1 }}
                    options={recipeNames}
                    value={recipe || null}
                    onChange={(_, newValue) => onRecipeChange(newValue || '')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Recipe"
                            placeholder="Search recipes..."
                            required
                            slotProps={{
                                input: {
                                    ...params.InputProps,
                                    startAdornment: recipe ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                            <FactorioIcon name={recipe} size={20} />
                                        </Box>
                                    ) : null,
                                },
                            }}
                        />
                    )}
                    renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        return (
                            <Box component="li" key={key} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FactorioIcon name={option} size={20} />
                                {option}
                            </Box>
                        );
                    }}
                    freeSolo
                    autoHighlight
                />
                <TextField
                    label="Items per Second"
                    type="number"
                    value={itemsPerSecond}
                    onChange={(e) => onItemsPerSecondChange(parseFloat(e.target.value) || 0)}
                    inputProps={{ step: 0.1, min: 0 }}
                    sx={{ width: 150 }}
                    required
                />
                <TextField
                    label="Machines"
                    type="number"
                    value={machines}
                    onChange={(e) => onMachinesChange(parseInt(e.target.value) || 1)}
                    inputProps={{ step: 1, min: 1 }}
                    sx={{ width: 120 }}
                    required
                />
            </Box>
        </Paper>
    );
}
