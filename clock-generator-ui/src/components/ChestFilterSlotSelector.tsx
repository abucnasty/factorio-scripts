import { Add, Close } from '@mui/icons-material';
import { Box, IconButton, Typography, Popover, TextField, Button } from '@mui/material';
import { useState } from 'react';
import { FactorioIcon } from './FactorioIcon';
import { ItemSelector } from './ItemSelector';

export interface ChestFilterSlot {
    item_name: string;
    quantity: number;
}

interface ChestFilterSlotSelectorProps {
    filters: ChestFilterSlot[];
    itemNames: string[];
    onFilterChange: (slotIndex: number, filter: ChestFilterSlot) => void;
    onRemoveFilter: (slotIndex: number) => void;
    onAddFilter: () => void;
    maxSlots?: number;
    quantityLabel?: string;
    canAddMore?: boolean;
}

export function ChestFilterSlotSelector({
    filters,
    itemNames,
    onFilterChange,
    onRemoveFilter,
    onAddFilter,
    maxSlots = 10,
    quantityLabel = 'Count',
    canAddMore = true,
}: ChestFilterSlotSelectorProps) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
    const [pendingItem, setPendingItem] = useState<string | null>(null);
    const [pendingQuantity, setPendingQuantity] = useState<number>(1);

    const handleSlotClick = (slotIndex: number, element: HTMLElement) => {
        const filter = filters[slotIndex];
        setPendingItem(filter?.item_name || null);
        setPendingQuantity(filter?.quantity || 1);
        setAnchorEl(element);
        setActiveSlotIndex(slotIndex);
    };

    const handleAddClick = (element: HTMLElement) => {
        setPendingItem(null);
        setPendingQuantity(1);
        setAnchorEl(element);
        setActiveSlotIndex(filters.length); // New slot index
    };

    const handleClose = () => {
        setAnchorEl(null);
        setActiveSlotIndex(null);
        setPendingItem(null);
        setPendingQuantity(1);
    };

    const handleItemSelect = (item: string | null) => {
        setPendingItem(item);
    };

    const handleQuantityChange = (value: number) => {
        setPendingQuantity(Math.max(1, value));
    };

    const handleConfirm = () => {
        if (activeSlotIndex !== null && pendingItem) {
            const isNewSlot = activeSlotIndex >= filters.length;
            if (isNewSlot) {
                onAddFilter();
                // Wait for the filter to be added, then update it
                setTimeout(() => {
                    onFilterChange(activeSlotIndex, {
                        item_name: pendingItem,
                        quantity: pendingQuantity,
                    });
                }, 0);
            } else {
                onFilterChange(activeSlotIndex, {
                    item_name: pendingItem,
                    quantity: pendingQuantity,
                });
            }
        }
        handleClose();
    };

    const displayedFilters = filters.slice(0, maxSlots);
    const showAddButton = canAddMore && filters.length < maxSlots;

    return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Render existing filter slots */}
            {displayedFilters.map((filter, slotIndex) => (
                <Box
                    key={slotIndex}
                    tabIndex={0}
                    role="button"
                    aria-label={
                        filter.item_name
                            ? `Filter ${slotIndex + 1}: ${filter.item_name} (${filter.quantity})`
                            : `Configure filter ${slotIndex + 1}`
                    }
                    onClick={(e) => handleSlotClick(slotIndex, e.currentTarget)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSlotClick(slotIndex, e.currentTarget);
                        }
                    }}
                    sx={{
                        width: 44,
                        height: 44,
                        border: '2px solid',
                        borderColor: filter.item_name ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        bgcolor: 'background.paper',
                        position: 'relative',
                        transition: 'all 0.2s',
                        m: 0.5,
                        '&:hover, &:focus': {
                            borderColor: 'primary.light',
                            bgcolor: 'action.hover',
                            outline: 'none',
                            transform: 'scale(1.05)',
                        },
                        '&:focus-visible': {
                            boxShadow: '0 0 0 2px',
                            boxShadowColor: 'primary.main',
                        },
                    }}
                >
                    {filter.item_name ? (
                        <>
                            <FactorioIcon name={filter.item_name} size={32} />
                            {/* Quantity badge */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: -6,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    px: 0.5,
                                    py: 0.25,
                                    borderRadius: 0.5,
                                    lineHeight: 1,
                                    minWidth: 16,
                                    textAlign: 'center',
                                }}
                            >
                                {filter.quantity}
                            </Box>
                            {/* Remove button */}
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveFilter(slotIndex);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onRemoveFilter(slotIndex);
                                    }
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
            ))}

            {/* Add new filter button */}
            {showAddButton && (
                <Box
                    tabIndex={0}
                    role="button"
                    aria-label="Add new filter"
                    onClick={(e) => handleAddClick(e.currentTarget)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAddClick(e.currentTarget);
                        }
                    }}
                    sx={{
                        width: 44,
                        height: 44,
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                        transition: 'all 0.2s',
                        m: 0.5,
                        '&:hover, &:focus': {
                            borderColor: 'primary.light',
                            bgcolor: 'action.hover',
                            outline: 'none',
                        },
                    }}
                >
                    <Add sx={{ fontSize: 20, color: 'text.disabled' }} />
                </Box>
            )}

            {/* Show count if there are more filters than slots */}
            {filters.length > maxSlots && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    +{filters.length - maxSlots} more
                </Typography>
            )}

            {/* Item selector popover */}
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2, width: 300 }}>
                    <ItemSelector
                        value={pendingItem}
                        options={itemNames}
                        onChange={handleItemSelect}
                        label="Select Item"
                        minWidth={268}
                    />
                    <TextField
                        label={quantityLabel}
                        type="number"
                        value={pendingQuantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1 }}
                        size="small"
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                        <Button onClick={handleClose} color='inherit'>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirm}
                            disabled={!pendingItem}
                            color='secondary'
                        >
                            Confirm
                        </Button>
                    </Box>
                </Box>
            </Popover>
        </Box>
    );
}
