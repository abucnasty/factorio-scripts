import { Delete } from '@mui/icons-material';
import {
    Box,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import type { ComparisonOperator, Condition, EntityReference } from '../hooks/useConfigForm';
import { useFullscreen } from './FullscreenContext';

const MACHINE_STATUSES = [
    { value: 'INGREDIENT_SHORTAGE', label: 'Ingredient Shortage' },
    { value: 'WORKING', label: 'Working' },
    { value: 'OUTPUT_FULL', label: 'Output Full' },
] as const;

type MachineStatus = typeof MACHINE_STATUSES[number]['value'];

interface StatusConditionRowProps {
    condition: Condition;
    onChange: (condition: Condition) => void;
    onDelete: () => void;
    sourceType: 'machine' | 'belt' | 'chest';
    sinkType: 'machine' | 'belt' | 'chest';
    canDelete: boolean;
}

export function StatusConditionRow({
    condition,
    onChange,
    onDelete,
    sourceType,
    sinkType,
    canDelete,
}: StatusConditionRowProps) {
    const isFullscreen = useFullscreen();
    
    // Responsive sizing
    const isNotSelectWidth = isFullscreen ? 100 : 80;
    const statusSelectWidth = isFullscreen ? 220 : 160;

    // Extract current values from the MACHINE_STATUS condition
    const currentEntity = condition.left.type === 'MACHINE_STATUS' ? condition.left.entity : 'SOURCE';
    const currentStatus = condition.left.type === 'MACHINE_STATUS' ? condition.left.status : 'OUTPUT_FULL';
    const isNegated = condition.operator === '!=';

    const handleEntityChange = (_: React.MouseEvent<HTMLElement>, newEntity: EntityReference | null) => {
        if (newEntity && condition.left.type === 'MACHINE_STATUS') {
            onChange({
                ...condition,
                left: { ...condition.left, entity: newEntity },
            });
        }
    };

    const handleNegationChange = (negated: boolean) => {
        const operator: ComparisonOperator = negated ? '!=' : '==';
        onChange({ ...condition, operator });
    };

    const handleStatusChange = (status: MachineStatus) => {
        if (condition.left.type === 'MACHINE_STATUS') {
            onChange({
                ...condition,
                left: { ...condition.left, status },
            });
        }
    };

    const entityDisabled = (entity: EntityReference) => {
        const entityType = entity === 'SOURCE' ? sourceType : sinkType;
        return entityType !== 'machine';
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
                py: 0.5,
            }}
        >
            <ToggleButtonGroup
                value={currentEntity}
                exclusive
                onChange={handleEntityChange}
                size="small"
            >
                <ToggleButton value="SOURCE" disabled={entityDisabled('SOURCE')}>
                    Source
                </ToggleButton>
                <ToggleButton value="SINK" disabled={entityDisabled('SINK')}>
                    Sink
                </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: isNotSelectWidth }}>
                <Select
                    value={isNegated ? 'is-not' : 'is'}
                    onChange={(e) => handleNegationChange(e.target.value === 'is-not')}
                >
                    <MenuItem value="is">is</MenuItem>
                    <MenuItem value="is-not">is not</MenuItem>
                </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: statusSelectWidth }}>
                <Select
                    value={currentStatus}
                    onChange={(e) => handleStatusChange(e.target.value as MachineStatus)}
                >
                    {MACHINE_STATUSES.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                            {s.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <IconButton
                onClick={onDelete}
                disabled={!canDelete}
                size="small"
                color="error"
            >
                <Delete fontSize="small" />
            </IconButton>
        </Box>
    );
}
