import { Autocomplete, Box, TextField } from '@mui/material';
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
}: ItemSelectorProps) {
    return (
        <Autocomplete
            size={size}
            sx={{ minWidth, ...sx }}
            options={options}
            value={value}
            onChange={(_, newValue) => onChange(newValue)}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
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
}
