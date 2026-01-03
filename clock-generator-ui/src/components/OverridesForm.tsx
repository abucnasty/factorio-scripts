import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    TextField,
    Typography,
} from '@mui/material';

interface OverridesFormProps {
    lcm?: number;
    terminalSwingCount?: number;
    onUpdate: (field: 'lcm' | 'terminal_swing_count', value: number | null) => void;
}

export function OverridesForm({
    lcm,
    terminalSwingCount,
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
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        label="LCM Override"
                        type="number"
                        value={lcm ?? ''}
                        onChange={(e) =>
                            onUpdate(
                                'lcm',
                                e.target.value ? parseInt(e.target.value) : null
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
                        value={terminalSwingCount ?? null}
                        onChange={(e) =>
                            onUpdate(
                                'terminal_swing_count',
                                e.target.value ? parseInt(e.target.value) : null
                            )
                        }
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ width: 240 }}
                        size="small"
                        helperText="Override max swings per cycle"
                    />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                    Note: If the final output machine has more than 1 inserter, the terminal swing count will be devided equally between them.
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
}
