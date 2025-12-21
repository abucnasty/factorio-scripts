import { Add, Delete, ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Box,
    Button,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import type { DrillFormData } from '../hooks/useConfigForm';

const DRILL_TYPES = [
    { value: 'electric-mining-drill', label: 'Electric Mining Drill' },
    { value: 'burner-mining-drill', label: 'Burner Mining Drill' },
    { value: 'big-mining-drill', label: 'Big Mining Drill' },
];

interface DrillsFormProps {
    enabled: boolean;
    miningProductivityLevel: number;
    drills: DrillFormData[];
    resourceNames: string[];
    machineIds: number[];
    onEnable: () => void;
    onDisable: () => void;
    onUpdateProductivityLevel: (value: number) => void;
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<DrillFormData>) => void;
    onRemove: (index: number) => void;
}

export function DrillsForm({
    enabled,
    miningProductivityLevel,
    drills,
    resourceNames,
    machineIds,
    onEnable,
    onDisable,
    onUpdateProductivityLevel,
    onAdd,
    onUpdate,
    onRemove,
}: DrillsFormProps) {
    return (
        <Accordion defaultExpanded={enabled}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6">
                        Mining Drills (Optional)
                    </Typography>
                    {!enabled && (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: 'primary.main', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                '&:hover': { color: 'primary.dark' }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEnable();
                            }}
                        >
                            Enable Drills
                        </Typography>
                    )}
                    {enabled && (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: 'error.main', 
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                '&:hover': { color: 'error.dark' }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDisable();
                            }}
                        >
                            Disable Drills
                        </Typography>
                    )}
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {enabled ? (
                    <>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                            <TextField
                                label="Mining Productivity Level"
                                type="number"
                                value={miningProductivityLevel}
                                onChange={(e) =>
                                    onUpdateProductivityLevel(parseInt(e.target.value) || 0)
                                }
                                inputProps={{ min: 0 }}
                                sx={{ width: 200 }}
                                size="small"
                            />
                            <Box sx={{ flex: 1 }} />
                            <Button startIcon={<Add />} onClick={onAdd} variant="outlined" size="small">
                                Add Drill
                            </Button>
                        </Box>

                        {drills.map((drill, index) => (
                            <Box
                                key={`drill-${index}`}
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
                                    value={drill.id}
                                    onChange={(e) =>
                                        onUpdate(index, { id: parseInt(e.target.value) || 1 })
                                    }
                                    inputProps={{ min: 1 }}
                                    sx={{ width: 80 }}
                                    size="small"
                                />
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <InputLabel>Drill Type</InputLabel>
                                    <Select
                                        value={drill.type}
                                        label="Drill Type"
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                type: e.target.value as DrillFormData['type'],
                                            })
                                        }
                                    >
                                        {DRILL_TYPES.map((dt) => (
                                            <MenuItem key={dt.value} value={dt.value}>
                                                {dt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Autocomplete
                                    sx={{ minWidth: 200, flex: 1 }}
                                    options={resourceNames}
                                    value={drill.mined_item_name || null}
                                    onChange={(_, newValue) =>
                                        onUpdate(index, { mined_item_name: newValue || '' })
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Mined Resource"
                                            placeholder="Search resources..."
                                            size="small"
                                        />
                                    )}
                                    freeSolo
                                    autoHighlight
                                />
                                <TextField
                                    label="Speed Bonus"
                                    type="number"
                                    value={drill.speed_bonus}
                                    onChange={(e) =>
                                        onUpdate(index, {
                                            speed_bonus: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    inputProps={{ step: 0.1 }}
                                    sx={{ width: 120 }}
                                    size="small"
                                />
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Target Machine</InputLabel>
                                    <Select
                                        value={drill.target.id}
                                        label="Target Machine"
                                        onChange={(e) =>
                                            onUpdate(index, {
                                                target: { type: 'machine', id: e.target.value as number },
                                            })
                                        }
                                    >
                                        {machineIds.map((id) => (
                                            <MenuItem key={id} value={id}>
                                                Machine {id}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <IconButton onClick={() => onRemove(index)} color="error">
                                    <Delete />
                                </IconButton>
                            </Box>
                        ))}

                        {drills.length === 0 && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textAlign: 'center', py: 2 }}
                            >
                                No drills configured. Add drills if you need mining input.
                            </Typography>
                        )}
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Mining drills are disabled. Enable them if your setup includes ore mining.
                    </Typography>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
