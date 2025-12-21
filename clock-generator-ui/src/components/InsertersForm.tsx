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
import type { InserterFormData } from '../hooks/useConfigForm';

interface InsertersFormProps {
    inserters: InserterFormData[];
    machineIds: number[];
    beltIds: number[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<InserterFormData>) => void;
    onRemove: (index: number) => void;
}

export function InsertersForm({
    inserters,
    machineIds,
    beltIds,
    onAdd,
    onUpdate,
    onRemove,
}: InsertersFormProps) {
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
                            onUpdate(index, { stack_size: parseInt(e.target.value) || 1 })
                        }
                        inputProps={{ min: 1, max: 16 }}
                        sx={{ width: 100 }}
                        size="small"
                    />

                    <TextField
                        label="Filters (comma-separated)"
                        value={inserter.filters?.join(', ') || ''}
                        onChange={(e) =>
                            onUpdate(index, {
                                filters: e.target.value
                                    ? e.target.value.split(',').map((s) => s.trim())
                                    : undefined,
                            })
                        }
                        sx={{ flex: 1, minWidth: 200 }}
                        size="small"
                    />

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
        </Paper>
    );
}
