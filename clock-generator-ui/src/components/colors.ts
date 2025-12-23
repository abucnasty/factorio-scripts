/**
 * Shared color utilities for timeline visualizations.
 * Uses a colorblind-friendly palette based on Wong (2011).
 */

import { StatusCategory, InserterStatus, MachineStatus, DrillStatus, EntityType } from 'clock-generator/browser';

// Colorblind-friendly palette (Wong, 2011)
export const COLOR_BLIND_PALETTE = {
    blue: "#0072B2",
    orange: "#E69F00",
    yellow: "#F0E442",
    green: "#009E73",
    skyBlue: "#56B4E9",
    vermillion: "#D55E00",
    reddishPurple: "#CC79A7",
    darkGrey: "#585858",
    lightGrey: "#AAAAAA",
    white: "#FFFFFF",
} as const;

export const COLOR_BLIND_PALETTE_ALL: string[] = Object.values(COLOR_BLIND_PALETTE);

// Status category colors (colorblind-friendly)
export const CATEGORY_COLORS: Record<StatusCategory, string> = {
    [StatusCategory.ACTIVE]: COLOR_BLIND_PALETTE.green,       // actively working
    [StatusCategory.WAITING]: COLOR_BLIND_PALETTE.yellow,     // waiting for something
    [StatusCategory.BLOCKED]: COLOR_BLIND_PALETTE.reddishPurple,     // blocked/cannot proceed
    [StatusCategory.DISABLED]: COLOR_BLIND_PALETTE.darkGrey,  // disabled by control
    [StatusCategory.IDLE]: COLOR_BLIND_PALETTE.lightGrey,     // nothing to do
};

// Detailed status colors for inserters
export const INSERTER_STATUS_COLORS: Record<InserterStatus, string> = {
    [InserterStatus.PICKUP]: COLOR_BLIND_PALETTE.green,        // picking up items
    [InserterStatus.DROP_OFF]: COLOR_BLIND_PALETTE.skyBlue,       // dropping items
    [InserterStatus.SWING]: COLOR_BLIND_PALETTE.blue,        // in motion
    [InserterStatus.IDLE]: COLOR_BLIND_PALETTE.lightGrey,     // waiting
    [InserterStatus.DISABLED]: COLOR_BLIND_PALETTE.darkGrey,  // disabled
};

// Detailed status colors for machines
export const MACHINE_STATUS_COLORS: Record<MachineStatus, string> = {
    [MachineStatus.WORKING]: COLOR_BLIND_PALETTE.green,      // actively crafting
    [MachineStatus.INGREDIENT_SHORTAGE]: COLOR_BLIND_PALETTE.yellow, // waiting for ingredients
    [MachineStatus.OUTPUT_FULL]: COLOR_BLIND_PALETTE.reddishPurple, // output blocked
};

// Detailed status colors for drills
export const DRILL_STATUS_COLORS: Record<DrillStatus, string> = {
    [DrillStatus.WORKING]: COLOR_BLIND_PALETTE.green,      // actively mining
    [DrillStatus.DISABLED]: COLOR_BLIND_PALETTE.darkGrey,  // disabled
};

/**
 * Get color for a specific status based on entity type (detailed view)
 */
export function getStatusColor(
    entityType: EntityType,
    status: string
): string {
    switch (entityType) {
        case EntityType.INSERTER:
            return INSERTER_STATUS_COLORS[status as InserterStatus] ?? INSERTER_STATUS_COLORS.IDLE;
        case EntityType.MACHINE:
            return MACHINE_STATUS_COLORS[status as MachineStatus] ?? MACHINE_STATUS_COLORS.WORKING;
        case EntityType.DRILL:
            return DRILL_STATUS_COLORS[status as DrillStatus] ?? DRILL_STATUS_COLORS.WORKING;
        default:
            return COLOR_BLIND_PALETTE.blue;
    }
}

/**
 * Get color for a status category (simplified view)
 */
export function getCategoryColor(category: StatusCategory): string {
    return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.IDLE;
}

/**
 * Get all status colors for an entity type
 */
export function getStatusColorsForEntityType(
    entityType: EntityType
): Record<string, string> {
    switch (entityType) {
        case EntityType.INSERTER:
            return INSERTER_STATUS_COLORS;
        case EntityType.MACHINE:
            return MACHINE_STATUS_COLORS;
        case EntityType.DRILL:
            return DRILL_STATUS_COLORS;
        default:
            throw new Error(`Unknown entity type: ${entityType}`);
    }
}

/**
 * Reason icon mappings for formatted display
 */
const REASON_ICONS: { pattern: RegExp; icon: string; label: string }[] = [
    { pattern: /clock/i, icon: '⏱', label: 'Clock signal' },
    { pattern: /inventory full|output full|blocked/i, icon: '📦', label: 'Inventory full' },
    { pattern: /waiting|ingredient|shortage/i, icon: '⏳', label: 'Waiting' },
    { pattern: /complete|done|finished/i, icon: '✅', label: 'Complete' },
    { pattern: /forced/i, icon: '⚡', label: 'Forced' },
    { pattern: /pickup/i, icon: '🔼', label: 'Pickup' },
    { pattern: /drop/i, icon: '🔽', label: 'Drop' },
    { pattern: /disabled/i, icon: '🚫', label: 'Disabled' },
    { pattern: /enabled/i, icon: '✓', label: 'Enabled' },
];

/**
 * Format a transition reason with an appropriate icon
 */
export function formatTransitionReason(reason: string): { icon: string; text: string } {
    for (const { pattern, icon } of REASON_ICONS) {
        if (pattern.test(reason)) {
            // Capitalize first letter
            const text = reason.charAt(0).toUpperCase() + reason.slice(1);
            return { icon, text };
        }
    }
    // Default formatting
    return { 
        icon: '→', 
        text: reason.charAt(0).toUpperCase() + reason.slice(1) 
    };
}

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: string): string {
    // Convert from UPPER_SNAKE_CASE to Title Case
    return status
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Get human-readable label for a category
 */
export function getCategoryLabel(category: StatusCategory): string {
    return getStatusLabel(category);
}
