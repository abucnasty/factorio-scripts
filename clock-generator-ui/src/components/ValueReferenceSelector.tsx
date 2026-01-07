import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import type { EntityReference, ValueReference } from '../hooks/useConfigForm';
import { useFullscreen } from './FullscreenContext';
import { ItemSelector } from './ItemSelector';

const VALUE_TYPES = [
    { value: 'CONSTANT', label: 'Constant' },
    { value: 'INVENTORY_ITEM', label: 'Inventory Item' },
    { value: 'AUTOMATED_INSERTION_LIMIT', label: 'Insertion Limit' },
    { value: 'OUTPUT_BLOCK', label: 'Output Block' },
    { value: 'CRAFTING_PROGRESS', label: 'Crafting Progress %' },
    { value: 'BONUS_PROGRESS', label: 'Bonus Progress %' },
    { value: 'HAND_QUANTITY', label: 'Hand Quantity' },
    { value: 'INSERTER_STACK_SIZE', label: 'Inserter Stack Size' },
] as const;

interface ValueReferenceSelectorProps {
    value: ValueReference;
    onChange: (value: ValueReference) => void;
    availableItems: string[];
    sourceType: 'machine' | 'belt' | 'chest';
    sinkType: 'machine' | 'belt' | 'chest';
    compact?: boolean;
}

function getDefaultValueReference(type: ValueReference['type']): ValueReference {
    switch (type) {
        case 'CONSTANT':
            return { type: 'CONSTANT', value: 0 };
        case 'INVENTORY_ITEM':
            return { type: 'INVENTORY_ITEM', entity: 'SINK', item_name: '' };
        case 'AUTOMATED_INSERTION_LIMIT':
            return { type: 'AUTOMATED_INSERTION_LIMIT', entity: 'SINK', item_name: '' };
        case 'OUTPUT_BLOCK':
            return { type: 'OUTPUT_BLOCK', entity: 'SOURCE' };
        case 'CRAFTING_PROGRESS':
            return { type: 'CRAFTING_PROGRESS', entity: 'SINK' };
        case 'BONUS_PROGRESS':
            return { type: 'BONUS_PROGRESS', entity: 'SINK' };
        case 'HAND_QUANTITY':
            return { type: 'HAND_QUANTITY' };
        case 'INSERTER_STACK_SIZE':
            return { type: 'INSERTER_STACK_SIZE' };
        default:
            // MACHINE_STATUS is handled by StatusConditionRow
            return { type: 'CONSTANT', value: 0 };
    }
}

function needsEntity(type: ValueReference['type']): boolean {
    return ['INVENTORY_ITEM', 'AUTOMATED_INSERTION_LIMIT', 'OUTPUT_BLOCK', 'CRAFTING_PROGRESS', 'BONUS_PROGRESS'].includes(type);
}

function needsItemName(type: ValueReference['type']): boolean {
    return ['INVENTORY_ITEM', 'AUTOMATED_INSERTION_LIMIT'].includes(type);
}

function isValidForEntityType(type: ValueReference['type'], entityType: 'machine' | 'belt' | 'chest'): boolean {
    if (entityType === 'machine') return true;
    const machineOnlyTypes: ValueReference['type'][] = [
        'CRAFTING_PROGRESS', 'BONUS_PROGRESS', 'AUTOMATED_INSERTION_LIMIT', 'OUTPUT_BLOCK'
    ];
    return !machineOnlyTypes.includes(type);
}

export function ValueReferenceSelector({
    value,
    onChange,
    availableItems,
    sourceType,
    sinkType,
    compact = false,
}: ValueReferenceSelectorProps) {
    const isFullscreen = useFullscreen();
    
    // Responsive sizing based on fullscreen mode
    const typeSelectWidth = isFullscreen ? 200 : (compact ? 120 : 160);
    const itemSelectorWidth = isFullscreen ? 300 : 180;
    const constantFieldWidth = isFullscreen ? 150 : 100;

    const handleTypeChange = (newType: ValueReference['type']) => {
        onChange(getDefaultValueReference(newType));
    };

    const handleEntityChange = (_: React.MouseEvent<HTMLElement>, newEntity: EntityReference | null) => {
        if (newEntity && 'entity' in value) {
            onChange({ ...value, entity: newEntity } as ValueReference);
        }
    };

    const filteredTypes = VALUE_TYPES.filter(vt => {
        if (!needsEntity(vt.value)) return true;
        return isValidForEntityType(vt.value, sourceType) || isValidForEntityType(vt.value, sinkType);
    });

    const entityDisabled = (entity: EntityReference) => {
        const entityType = entity === 'SOURCE' ? sourceType : sinkType;
        return !isValidForEntityType(value.type, entityType);
    };

    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: typeSelectWidth }}>
                <InputLabel>Type</InputLabel>
                <Select
                    value={value.type}
                    label="Type"
                    onChange={(e) => handleTypeChange(e.target.value as ValueReference['type'])}
                >
                    {filteredTypes.map((vt) => (
                        <MenuItem key={vt.value} value={vt.value}>
                            {vt.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {needsEntity(value.type) && 'entity' in value && (
                <ToggleButtonGroup
                    value={value.entity}
                    exclusive
                    onChange={handleEntityChange}
                    size="small"
                >
                    <ToggleButton value="SOURCE" disabled={entityDisabled('SOURCE')}>
                        Src
                    </ToggleButton>
                    <ToggleButton value="SINK" disabled={entityDisabled('SINK')}>
                        Sink
                    </ToggleButton>
                </ToggleButtonGroup>
            )}

            {value.type === 'CONSTANT' && (
                <TextField
                    type="number"
                    value={value.value}
                    onChange={(e) => onChange({ ...value, value: parseFloat(e.target.value) || 0 })}
                    size="small"
                    sx={{ width: constantFieldWidth }}
                    label="Value"
                />
            )}

            {needsItemName(value.type) && 'item_name' in value && (
                <ItemSelector
                    value={value.item_name || null}
                    options={availableItems}
                    onChange={(newValue) => 
                        onChange({ ...value, item_name: newValue || '' } as ValueReference)
                    }
                    label="Item"
                    minWidth={itemSelectorWidth}
                    iconOnly
                />
            )}

            {value.type === 'HAND_QUANTITY' && (
                <ItemSelector
                    value={value.item_name || null}
                    options={availableItems}
                    onChange={(newValue) => 
                        onChange({ ...value, item_name: newValue || undefined })
                    }
                    label="Item (optional)"
                    minWidth={itemSelectorWidth}
                    iconOnly
                />
            )}
        </Box>
    );
}
