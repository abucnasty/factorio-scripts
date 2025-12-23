import { DrillStatus, InserterStatus, MachineStatus } from "./index";

/**
 * Simplified status categories for high-level visualization.
 * Maps detailed statuses to broader categories.
 */
export const StatusCategory = {
    /** Entity is actively performing its primary function */
    ACTIVE: 'ACTIVE',
    /** Entity is waiting for something (e.g., ingredients) */
    WAITING: 'WAITING',
    /** Entity is blocked and cannot proceed (e.g., output full) */
    BLOCKED: 'BLOCKED',
    /** Entity is disabled by control logic (e.g., clock signal) */
    DISABLED: 'DISABLED',
    /** Entity is idle with nothing to do */
    IDLE: 'IDLE',
} as const;

export type StatusCategory = typeof StatusCategory[keyof typeof StatusCategory];

/**
 * Map an InserterStatus to a StatusCategory
 */
export function inserterStatusToCategory(status: InserterStatus): StatusCategory {
    switch (status) {
        case InserterStatus.PICKUP:
        case InserterStatus.DROP_OFF:
        case InserterStatus.SWING:
            return StatusCategory.ACTIVE;
        case InserterStatus.IDLE:
            return StatusCategory.IDLE;
        case InserterStatus.DISABLED:
            return StatusCategory.DISABLED;
        default:
            return StatusCategory.IDLE;
    }
}

/**
 * Map a MachineStatus to a StatusCategory
 */
export function machineStatusToCategory(status: MachineStatus): StatusCategory {
    switch (status) {
        case MachineStatus.WORKING:
            return StatusCategory.ACTIVE;
        case MachineStatus.INGREDIENT_SHORTAGE:
            return StatusCategory.WAITING;
        case MachineStatus.OUTPUT_FULL:
            return StatusCategory.BLOCKED;
        default:
            return StatusCategory.IDLE;
    }
}

/**
 * Map a DrillStatus to a StatusCategory
 */
export function drillStatusToCategory(status: DrillStatus): StatusCategory {
    switch (status) {
        case DrillStatus.WORKING:
            return StatusCategory.ACTIVE;
        case DrillStatus.DISABLED:
            return StatusCategory.DISABLED;
        default:
            return StatusCategory.IDLE;
    }
}

/**
 * Map any entity status string to a StatusCategory based on entity type
 */
export function statusToCategory(
    entityType: 'inserter' | 'machine' | 'drill',
    status: string
): StatusCategory {
    switch (entityType) {
        case 'inserter':
            return inserterStatusToCategory(status as InserterStatus);
        case 'machine':
            return machineStatusToCategory(status as MachineStatus);
        case 'drill':
            return drillStatusToCategory(status as DrillStatus);
        default:
            return StatusCategory.IDLE;
    }
}

/**
 * Get all possible statuses for an entity type
 */
export function getStatusesForEntityType(entityType: 'inserter' | 'machine' | 'drill'): string[] {
    switch (entityType) {
        case 'inserter':
            return Object.values(InserterStatus);
        case 'machine':
            return Object.values(MachineStatus);
        case 'drill':
            return Object.values(DrillStatus);
        default:
            return [];
    }
}

/**
 * Get all status categories
 */
export function getAllStatusCategories(): StatusCategory[] {
    return Object.values(StatusCategory);
}
