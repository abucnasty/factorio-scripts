import { Autocomplete, Box, TextField, Tooltip } from '@mui/material';
import { FactorioIcon } from './FactorioIcon';

interface ItemSelectorProps {
    value: string | null;
    options: string[];
    onChange: (value: string | null) => void;
    label?: string;
    placeholder?: string;
    size?: 'small' | 'medium';
    minWidth?: number;
    freeSolo?: boolean;
    sx?: object;
    /** If true, only show the icon in the selected value (text shown in dropdown and tooltip) */
    iconOnly?: boolean;
}

export function ItemSelector({
    value,
    options,
    onChange,
    label = 'Item',
    placeholder = 'Search items...',
    size = 'small',
    minWidth = 200,
    freeSolo = false,
    sx,
    iconOnly = false,
}: ItemSelectorProps) {
    // For iconOnly mode, use a more compact width
    const effectiveMinWidth = iconOnly && value ? 80 : minWidth;

    const autocomplete = (
        <Autocomplete
            size={size}
            sx={{ minWidth: effectiveMinWidth, ...sx }}
            options={options}
            value={value}
            onChange={(_, newValue) => onChange(newValue)}
            // When iconOnly, don't show the text in the input field
            getOptionLabel={(option) => iconOnly ? '' : option}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={iconOnly ? '' : placeholder}
                    slotProps={{
                        input: {
                            ...params.InputProps,
                            startAdornment: value ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                    <FactorioIcon name={value} size={20} />
                                </Box>
                            ) : null,
                        },
                    }}
                />
            )}
            renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                    <Box
                        component="li"
                        key={key}
                        {...rest}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                        <FactorioIcon name={option} size={20} />
                        {option}
                    </Box>
                );
            }}
            freeSolo={freeSolo}
            autoHighlight
        />
    );

    // Wrap in tooltip when iconOnly to show the full name on hover
    if (iconOnly && value) {
        return (
            <Tooltip title={value} placement="top">
                <Box>{autocomplete}</Box>
            </Tooltip>
        );
    }

    return autocomplete;
}
