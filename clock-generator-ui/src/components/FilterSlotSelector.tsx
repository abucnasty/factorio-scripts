import { Add, Close } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { FactorioIcon } from './FactorioIcon';

interface FilterSlotSelectorProps {
    /** Explicit filters set by the user */
    filters?: string[];
    /** Inferred/auto-populated filters from source/sink analysis */
    inferredFilters?: string[];
    /** Callback when a slot is clicked to set/change a filter */
    onSlotClick: (slotIndex: number, element: HTMLElement) => void;
    /** Callback when a filter is removed */
    onRemoveFilter: (slotIndex: number) => void;
    /** Number of filter slots to display */
    maxSlots?: number;
}

export function FilterSlotSelector({
    filters = [],
    inferredFilters = [],
    onSlotClick,
    onRemoveFilter,
    maxSlots = 5,
}: FilterSlotSelectorProps) {
    const hasExplicitFilters = filters.length > 0;
    const shouldShowInferred = !hasExplicitFilters && inferredFilters.length > 0;

    return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Filters:
            </Typography>

            {/* Render filter slots */}
            {Array.from({ length: maxSlots }).map((_, slotIndex) => {
                // Determine what to display in this slot
                const explicitFilter = filters[slotIndex];
                const inferredFilter = shouldShowInferred ? inferredFilters[slotIndex] : undefined;
                const displayFilter = explicitFilter || inferredFilter;
                const isAutoAssigned = !explicitFilter && !!inferredFilter;

                return (
                    <Box
                        key={slotIndex}
                        tabIndex={0}
                        role="button"
                        aria-label={
                            displayFilter
                                ? `Filter ${slotIndex + 1}: ${displayFilter}${isAutoAssigned ? ' (auto)' : ''}`
                                : `Add filter ${slotIndex + 1}`
                        }
                        onClick={(e) => onSlotClick(slotIndex, e.currentTarget)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSlotClick(slotIndex, e.currentTarget);
                            }
                        }}
                        sx={{
                            width: 36,
                            height: 36,
                            border: '2px solid',
                            borderStyle: isAutoAssigned ? 'dashed' : 'solid',
                            borderColor: displayFilter
                                ? isAutoAssigned
                                    ? 'warning.main'
                                    : 'primary.main'
                                : 'divider',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            bgcolor: 'background.paper',
                            position: 'relative',
                            opacity: isAutoAssigned ? 0.85 : 1,
                            transition: 'all 0.2s',
                            '&:hover, &:focus': {
                                borderColor: displayFilter
                                    ? isAutoAssigned
                                        ? 'warning.dark'
                                        : 'primary.light'
                                    : 'primary.light',
                                bgcolor: 'action.hover',
                                opacity: 1,
                                outline: 'none',
                                transform: 'scale(1.05)',
                            },
                            '&:focus-visible': {
                                boxShadow: '0 0 0 2px',
                                boxShadowColor: 'primary.main',
                            },
                        }}
                    >
                        {displayFilter ? (
                            <>
                                <FactorioIcon name={displayFilter} size={28} />
                                {/* Show auto badge for inferred filters */}
                                {isAutoAssigned && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -8,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            bgcolor: 'warning.main',
                                            color: 'warning.contrastText',
                                            fontSize: '8px',
                                            fontWeight: 'bold',
                                            px: 0.5,
                                            py: 0.25,
                                            borderRadius: 0.5,
                                            lineHeight: 1,
                                        }}
                                    >
                                        AUTO
                                    </Box>
                                )}
                                {/* Show remove button for all filters (explicit and auto-assigned) */}
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFilter(slotIndex);
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: -8,
                                        right: -8,
                                        width: 16,
                                        height: 16,
                                        bgcolor: 'error.main',
                                        '&:hover': { bgcolor: 'error.dark' },
                                    }}
                                >
                                    <Close sx={{ fontSize: 12, color: 'white' }} />
                                </IconButton>
                            </>
                        ) : (
                            <Add sx={{ fontSize: 16, color: 'text.disabled' }} />
                        )}
                    </Box>
                );
            })}

            {/* Show count if there are more inferred items than slots */}
            {shouldShowInferred && inferredFilters.length > maxSlots && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    +{inferredFilters.length - maxSlots} more
                </Typography>
            )}
        </Box>
    );
}
