import { Box } from '@mui/material';

interface FactorioIconProps {
    name: string;
    size?: number;
    fallback?: React.ReactNode;
}

/**
 * Displays a Factorio icon if available in public/icons folder.
 * Falls back to nothing or a custom fallback if the icon doesn't exist.
 */
export function FactorioIcon({ name, size = 24, fallback = null }: FactorioIconProps) {
    // Normalize the name to match icon file naming convention
    const iconName = name.toLowerCase().replace(/_/g, '-');
    const iconPath = `/icons/${iconName}.png`;

    return (
        <Box
            component="img"
            src={iconPath}
            alt={name}
            sx={{
                width: size,
                height: size,
                objectFit: 'contain',
                imageRendering: 'pixelated', // Crisp pixel art scaling
            }}
            onError={(e) => {
                // Hide the image if it fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
            }}
        />
    );
}

interface FactorioIconWithLabelProps extends FactorioIconProps {
    label?: string;
    gap?: number;
}

/**
 * Displays a Factorio icon with a label next to it.
 */
export function FactorioIconWithLabel({ 
    name, 
    label, 
    size = 24, 
    gap = 1,
    fallback = null 
}: FactorioIconWithLabelProps) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap }}>
            <FactorioIcon name={name} size={size} fallback={fallback} />
            {label && <span>{label}</span>}
        </Box>
    );
}
