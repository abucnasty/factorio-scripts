import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import type { RuleSet } from '../hooks/useConfigForm';

interface Template {
    id: string;
    name: string;
    description: string;
    getRuleSet: (itemName: string) => RuleSet;
    // For latched templates, returns the release condition
    // The getRuleSet becomes the base/enable condition
    getRelease?: (itemName: string) => RuleSet;
}

const TEMPLATES: Template[] = [
    {
        id: 'source-output-blocked',
        name: 'Source Output Full',
        description: 'Enable when source machine status is in Output Full',
        getRuleSet: () => ({
            operator: 'AND',
            rules: [{
                left: { type: 'MACHINE_STATUS', entity: 'SOURCE', status: 'OUTPUT_FULL' },
                operator: '==',
                right: { type: 'CONSTANT', value: 1 },
            }],
        }),
    },
    {
        id: 'sink-below-limit',
        name: 'Sink Below Insertion Limit',
        description: 'Enable when sink inventory is below automated insertion limit',
        getRuleSet: (itemName) => ({
            operator: 'AND',
            rules: [{
                left: { type: 'INVENTORY_ITEM', entity: 'SINK', item_name: itemName },
                operator: '<',
                right: { type: 'AUTOMATED_INSERTION_LIMIT', entity: 'SINK', item_name: itemName },
            }],
        }),
    },
    {
        id: 'latched-output-drain',
        name: 'Latched Output Drain',
        description: 'Enable when sink reaches threshold, release when drained to output block',
        getRuleSet: (itemName) => ({
            operator: 'AND',
            rules: [{
                left: { type: 'INVENTORY_ITEM', entity: 'SOURCE', item_name: itemName },
                operator: '>=',
                right: { type: 'CONSTANT', value: 32 },
            }],
        }),
        getRelease: (itemName) => ({
            operator: 'AND',
            rules: [{
                left: { type: 'INVENTORY_ITEM', entity: 'SINK', item_name: itemName },
                operator: '<=',
                right: { type: 'OUTPUT_BLOCK', entity: 'SINK' },
            }],
        }),
    },
];

interface QuickTemplateSelectProps {
    // onApply receives ruleSet (the base/enable condition) and optional release condition
    onApply: (ruleSet: RuleSet, release?: RuleSet) => void;
    defaultItemName: string;
}

export function QuickTemplateSelect({ onApply, defaultItemName }: QuickTemplateSelectProps) {
    const handleSelect = (templateId: string) => {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (template) {
            const ruleSet = template.getRuleSet(defaultItemName);
            const release = template.getRelease?.(defaultItemName);
            onApply(ruleSet, release);
        }
    };

    return (
        <Box sx={{ mb: 2 }}>
            <FormControl size="small" fullWidth>
                <InputLabel shrink>Quick Templates</InputLabel>
                <Select
                    value=""
                    label="Quick Templates"
                    onChange={(e) => handleSelect(e.target.value)}
                    displayEmpty
                    notched
                    renderValue={() => (
                        <Typography variant="body2" color="text.secondary">
                            Select a template to apply...
                        </Typography>
                    )}
                >
                    {TEMPLATES.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                            <Box>
                                <Typography variant="body2">{template.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {template.description}
                                </Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
