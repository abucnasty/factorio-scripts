import { Add, Close, Delete } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import type { EnableControlMode, EnableControlOverride, EnableControlRange } from '../hooks/useConfigForm';

interface EnableControlModalProps {
    open: boolean;
    onClose: () => void;
    entityType: 'inserter' | 'drill';
    entityLabel: string;
    currentOverride?: EnableControlOverride;
    onSave: (override: EnableControlOverride | undefined) => void;
}

const MODE_DESCRIPTIONS: Record<EnableControlMode, string> = {
    AUTO: 'Use automatic control logic (default behavior)',
    ALWAYS: 'Entity is always enabled',
    NEVER: 'Entity is never enabled',
    CLOCKED: 'Entity is enabled during specified tick ranges',
};

export function EnableControlModal({
    open,
    onClose,
    entityType,
    entityLabel,
    currentOverride,
    onSave,
}: EnableControlModalProps) {
    const [mode, setMode] = useState<EnableControlMode>('AUTO');
    const [ranges, setRanges] = useState<EnableControlRange[]>([{ start: 0, end: 100 }]);
    const [periodDuration, setPeriodDuration] = useState<string>('');

    // Initialize state from currentOverride when modal opens
    useEffect(() => {
        if (open) {
            if (currentOverride) {
                setMode(currentOverride.mode);
                if (currentOverride.mode === 'CLOCKED' && currentOverride.ranges) {
                    setRanges(currentOverride.ranges);
                    setPeriodDuration(currentOverride.period_duration_ticks?.toString() || '');
                } else {
                    setRanges([{ start: 0, end: 100 }]);
                    setPeriodDuration('');
                }
            } else {
                setMode('AUTO');
                setRanges([{ start: 0, end: 100 }]);
                setPeriodDuration('');
            }
        }
    }, [open, currentOverride]);

    const handleAddRange = () => {
        const lastRange = ranges[ranges.length - 1];
        const newStart = lastRange ? lastRange.end + 50 : 0;
        setRanges([...ranges, { start: newStart, end: newStart + 100 }]);
    };

    const handleRemoveRange = (index: number) => {
        if (ranges.length > 1) {
            setRanges(ranges.filter((_, i) => i !== index));
        }
    };

    const handleUpdateRange = (index: number, field: 'start' | 'end', value: number) => {
        setRanges(ranges.map((range, i) => 
            i === index ? { ...range, [field]: value } : range
        ));
    };

    const handleSave = () => {
        if (mode === 'AUTO') {
            // Clear the override entirely
            onSave(undefined);
        } else if (mode === 'CLOCKED') {
            const override: EnableControlOverride = {
                mode: 'CLOCKED',
                ranges: ranges.filter(r => r.end > r.start),
            };
            if (periodDuration && parseInt(periodDuration) > 0) {
                override.period_duration_ticks = parseInt(periodDuration);
            }
            onSave(override);
        } else {
            onSave({ mode });
        }
        onClose();
    };

    const handleClear = () => {
        onSave(undefined);
        onClose();
    };

    const hasOverride = currentOverride && currentOverride.mode !== 'AUTO';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6">Enable Control Override</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {entityLabel}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} edge="end">
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure when this {entityType} should be enabled during the crafting cycle.
                </Typography>

                <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                        value={mode}
                        onChange={(e) => setMode(e.target.value as EnableControlMode)}
                    >
                        {(['AUTO', 'ALWAYS', 'NEVER', 'CLOCKED'] as EnableControlMode[]).map((m) => (
                            <FormControlLabel
                                key={m}
                                value={m}
                                control={<Radio />}
                                label={
                                    <Box>
                                        <Typography variant="body1">{m}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {MODE_DESCRIPTIONS[m]}
                                        </Typography>
                                    </Box>
                                }
                                sx={{ mb: 1, alignItems: 'flex-start' }}
                            />
                        ))}
                    </RadioGroup>
                </FormControl>

                {/* CLOCKED mode configuration */}
                {mode === 'CLOCKED' && (
                    <Box sx={{ mt: 3, pl: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Enable Ranges
                        </Typography>
                        
                        {ranges.map((range, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    alignItems: 'center',
                                    mb: 1,
                                }}
                            >
                                <TextField
                                    label="Start Tick"
                                    type="number"
                                    value={range.start}
                                    onChange={(e) => handleUpdateRange(index, 'start', parseInt(e.target.value) || 0)}
                                    size="small"
                                    sx={{ width: 120 }}
                                    inputProps={{ min: 0 }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    to
                                </Typography>
                                <TextField
                                    label="End Tick"
                                    type="number"
                                    value={range.end}
                                    onChange={(e) => handleUpdateRange(index, 'end', parseInt(e.target.value) || 0)}
                                    size="small"
                                    sx={{ width: 120 }}
                                    inputProps={{ min: 1 }}
                                />
                                <IconButton
                                    onClick={() => handleRemoveRange(index)}
                                    disabled={ranges.length <= 1}
                                    size="small"
                                    color="error"
                                >
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        
                        <Button
                            startIcon={<Add />}
                            onClick={handleAddRange}
                            size="small"
                            sx={{ mt: 1 }}
                        >
                            Add Range
                        </Button>

                        <Box sx={{ mt: 3 }}>
                            <TextField
                                label="Period Duration (ticks)"
                                type="number"
                                value={periodDuration}
                                onChange={(e) => setPeriodDuration(e.target.value)}
                                size="small"
                                sx={{ width: 200 }}
                                inputProps={{ min: 1 }}
                                helperText="Optional. Defaults to crafting cycle duration."
                            />
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                    {hasOverride && (
                        <Button onClick={handleClear} color="error">
                            Clear Override
                        </Button>
                    )}
                </Box>
                <Box>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
