import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    FormControlLabel,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

interface OverridesFormProps {
    lcm?: number;
    terminalSwingCount?: number;
    useFractionalSwings?: boolean;
    onUpdate: (field: 'lcm' | 'terminal_swing_count' | 'use_fractional_swings', value: number | boolean | undefined) => void;
}

export function OverridesForm({
    lcm,
    terminalSwingCount,
    useFractionalSwings,
    onUpdate,
}: OverridesFormProps) {
    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                    Advanced Overrides (Optional)
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    These options allow you to manually override calculated values.
                    Leave empty to use automatic calculation.
                    <br />
                    
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <TextField
                        label="LCM Override"
                        type="number"
                        value={lcm ?? ''}
                        onChange={(e) =>
                            onUpdate(
                                'lcm',
                                e.target.value ? parseInt(e.target.value) : undefined
                            )
                        }
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ width: 200 }}
                        size="small"
                        helperText="Override the calculated LCM"
                    />
                    <TextField
                        label="Terminal Swing Count"
                        type="number"
                        value={terminalSwingCount ?? undefined}
                        onChange={(e) =>
                            onUpdate(
                                'terminal_swing_count',
                                e.target.value ? parseFloat(e.target.value) : undefined
                            )
                        }
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ width: 240 }}
                        size="small"
                        helperText="Override max swings per cycle"
                    />
                    <Tooltip 
                        title="When enabled, inserters with fractional swing counts (e.g., 1.5 swings per cycle) will distribute swings across multiple sub-cycles. For example, 3/2 swings becomes 1 swing in the first sub-cycle and 2 swings in the second."
                        arrow
                        placement="top"
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={useFractionalSwings ?? false}
                                    color="primary"
                                    onChange={(e) =>
                                        onUpdate(
                                            'use_fractional_swings',
                                            e.target.checked ? true : undefined
                                        )
                                    }
                                />
                            }
                            label="Enable Fractional Swings"
                            sx={{ ml: 1 }}
                        />
                    </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                    Note: If the final output machine has more than 1 inserter, the terminal swing count will be devided equally between them.
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
}
