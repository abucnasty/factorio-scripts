import { Add, Close, Delete, Fullscreen, FullscreenExit } from '@mui/icons-material';
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
    Tooltip,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import type { EnableControlMode, EnableControlOverride, EnableControlRange, RuleSet } from '../hooks/useConfigForm';
import { createDefaultRuleSet, RuleSetEditor } from './RuleSetEditor';
import { FullscreenProvider } from './FullscreenContext';
import { LatchConfigEditor } from './LatchConfigEditor';
import { QuickTemplateSelect } from './QuickTemplateSelect';

interface EnableControlModalProps {
    open: boolean;
    onClose: () => void;
    entityType: 'inserter' | 'drill';
    entityLabel: string;
    currentOverride?: EnableControlOverride;
    onSave: (override: EnableControlOverride | undefined) => void;
    sourceType?: 'machine' | 'belt' | 'chest';
    sinkType?: 'machine' | 'belt' | 'chest';
    availableItems?: string[];
}

const MODE_DESCRIPTIONS: Record<EnableControlMode, string> = {
    AUTO: 'Use automatic control logic (default behavior)',
    ALWAYS: 'Entity is always enabled',
    NEVER: 'Entity is never enabled',
    CLOCKED: 'Entity is enabled during specified tick ranges',
    CONDITIONAL: 'Entity is enabled based on custom conditions',
};

// Inner component that resets when key changes
function EnableControlModalContent({
    onClose,
    entityType,
    entityLabel,
    currentOverride,
    onSave,
    sourceType = 'machine',
    sinkType = 'machine',
    availableItems = [],
}: Omit<EnableControlModalProps, 'open'>) {
    // Initialize state from currentOverride
    const initialMode = currentOverride?.mode ?? 'AUTO';
    const initialRanges = (currentOverride?.mode === 'CLOCKED' && currentOverride?.ranges) 
        ? currentOverride.ranges 
        : [{ start: 0, end: 100 }];
    const initialPeriodDuration = 
        (currentOverride?.mode === 'CLOCKED' ? currentOverride?.period_duration_ticks?.toString() : '') ?? '';
    const initialRuleSet = (currentOverride?.mode === 'CONDITIONAL' && currentOverride?.rule_set) 
        ? currentOverride.rule_set 
        : createDefaultRuleSet();
    const initialLatchEnabled = !!(currentOverride?.mode === 'CONDITIONAL' && currentOverride?.latch);
    const initialReleaseCondition = (currentOverride?.mode === 'CONDITIONAL' && currentOverride?.latch?.release) 
        ? currentOverride.latch.release 
        : undefined;

    const [mode, setMode] = useState<EnableControlMode>(initialMode);
    const [ranges, setRanges] = useState<EnableControlRange[]>(initialRanges);
    const [periodDuration, setPeriodDuration] = useState<string>(initialPeriodDuration);
    const [ruleSet, setRuleSet] = useState<RuleSet>(initialRuleSet);
    const [latchEnabled, setLatchEnabled] = useState<boolean>(initialLatchEnabled);
    const [releaseCondition, setReleaseCondition] = useState<RuleSet | undefined>(initialReleaseCondition);

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
        } else if (mode === 'CONDITIONAL') {
            const override: EnableControlOverride = {
                mode: 'CONDITIONAL',
                rule_set: ruleSet,
                latch: latchEnabled && releaseCondition ? {
                    release: releaseCondition,
                } : undefined,
            };
            onSave(override);
        } else if (mode === 'ALWAYS') {
            onSave({ mode: 'ALWAYS' });
        } else if (mode === 'NEVER') {
            onSave({ mode: 'NEVER' });
        }
        onClose();
    };

    const handleApplyTemplate = (templateRuleSet: RuleSet, templateRelease?: RuleSet) => {
        setRuleSet(templateRuleSet);
        if (templateRelease) {
            setLatchEnabled(true);
            setReleaseCondition(templateRelease);
        } else {
            setLatchEnabled(false);
            setReleaseCondition(undefined);
        }
    };

    const handleClear = () => {
        onSave(undefined);
        onClose();
    };

    const hasOverride = currentOverride && currentOverride.mode !== 'AUTO';
    const [isFullscreen, setIsFullscreen] = useState(false);

    return (
        <Dialog 
            open 
            onClose={onClose} 
            maxWidth={isFullscreen ? false : "md"} 
            fullWidth 
            fullScreen={isFullscreen}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h6">Enable Control Override</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {entityLabel}
                    </Typography>
                </Box>
                <Box>
                    <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                        <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={onClose} edge="end">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <FullscreenProvider value={isFullscreen}>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure when this {entityType} should be enabled during the crafting cycle.
                </Typography>

                <FormControl component="fieldset" fullWidth>
                    <RadioGroup
                        value={mode}
                        onChange={(e) => setMode(e.target.value as EnableControlMode)}
                    >
                        {(['AUTO', 'ALWAYS', 'NEVER', 'CLOCKED', 'CONDITIONAL'] as EnableControlMode[]).map((m) => (
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

                {/* CONDITIONAL mode configuration */}
                {mode === 'CONDITIONAL' && (
                    <Box sx={{ mt: 3, pl: 2 }}>
                        <QuickTemplateSelect
                            onApply={handleApplyTemplate}
                            defaultItemName={availableItems[0] || ''}
                        />
                        
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Conditions
                        </Typography>
                        
                        <RuleSetEditor
                            ruleSet={ruleSet}
                            onChange={setRuleSet}
                            availableItems={availableItems}
                            sourceType={sourceType}
                            sinkType={sinkType}
                        />

                        <LatchConfigEditor
                            enabled={latchEnabled}
                            releaseCondition={releaseCondition}
                            onToggle={setLatchEnabled}
                            onReleaseChange={setReleaseCondition}
                            availableItems={availableItems}
                            sourceType={sourceType}
                            sinkType={sinkType}
                        />
                    </Box>
                )}
            </DialogContent>
            </FullscreenProvider>
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

export function EnableControlModal({
    open,
    ...props
}: EnableControlModalProps) {
    // When the dialog is closed (open=false), the content unmounts
    // When it opens again, a fresh EnableControlModalContent is created with initial state
    if (!open) return null;

    return <EnableControlModalContent {...props} />;
}
