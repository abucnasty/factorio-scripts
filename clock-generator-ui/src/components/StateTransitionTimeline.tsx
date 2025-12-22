import { Close, Fullscreen, FilterList, Sort, Visibility } from '@mui/icons-material';
import {
    Box,
    Checkbox,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useState, useMemo } from 'react';
import type {
    SerializableStateTransitionHistory,
    SerializableEntityStateTransitions,
    SerializableStateTransition,
    StatusCategory,
} from 'clock-generator/browser';
import { statusToCategory } from 'clock-generator/browser';
import { FactorioIcon } from './FactorioIcon';
import {
    getStatusColor,
    getCategoryColor,
    getStatusLabel,
    getCategoryLabel,
    formatTransitionReason,
    CATEGORY_COLORS,
    INSERTER_STATUS_COLORS,
    MACHINE_STATUS_COLORS,
    DRILL_STATUS_COLORS,
} from './colors';
import { sortByRelationship, sortByType } from './topological-sort';

interface StateTransitionTimelineProps {
    stateTransitionHistory: SerializableStateTransitionHistory;
}

type ViewMode = 'detailed' | 'simplified';
type SortMode = 'byType' | 'byRelationship';

interface EntityFilters {
    inserter: boolean;
    machine: boolean;
    drill: boolean;
}

interface StatusBarProps {
    transition: SerializableStateTransition;
    totalDuration: number;
    rowHeight: number;
    entityType: 'inserter' | 'machine' | 'drill';
    viewMode: ViewMode;
}

function StatusBar({ transition, totalDuration, rowHeight, entityType, viewMode }: StatusBarProps) {
    const startPercent = (transition.tick / totalDuration) * 100;
    const widthPercent = (transition.duration_ticks / totalDuration) * 100;
    
    const color = viewMode === 'detailed'
        ? getStatusColor(entityType, transition.to_status)
        : getCategoryColor(statusToCategory(entityType, transition.to_status));

    const statusLabel = viewMode === 'detailed'
        ? getStatusLabel(transition.to_status)
        : getCategoryLabel(statusToCategory(entityType, transition.to_status));

    const { icon, text } = formatTransitionReason(transition.reason);

    return (
        <Tooltip
            title={
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {statusLabel}
                    </Typography>
                    <Typography variant="caption" display="block">
                        From: {getStatusLabel(transition.from_status)}
                    </Typography>
                    <Typography variant="caption" display="block">
                        Tick {transition.tick} ({transition.duration_ticks} ticks)
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {icon} {text}
                    </Typography>
                </Box>
            }
            arrow
            placement="top"
        >
            <Box
                sx={{
                    position: 'absolute',
                    left: `${startPercent}%`,
                    width: `${Math.max(widthPercent, 0.3)}%`,
                    height: rowHeight - 4,
                    top: 2,
                    bgcolor: color,
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    transition: 'opacity 0.2s, transform 0.1s',
                    '&:hover': {
                        opacity: 0.8,
                        transform: 'scaleY(1.1)',
                        zIndex: 1,
                    },
                }}
            />
        </Tooltip>
    );
}

interface EntityRowProps {
    entity: SerializableEntityStateTransitions;
    totalDuration: number;
    rowHeight: number;
    viewMode: ViewMode;
}

function EntityRow({ entity, totalDuration, rowHeight, viewMode }: EntityRowProps) {
    const transitionCount = entity.transitions.length;

    // Get icon name based on entity type
    const iconName = entity.entity_type === 'inserter' 
        ? 'stack-inserter' 
        : entity.entity_type === 'drill'
        ? 'electric-mining-drill'
        : 'assembling-machine-3';

    // Get entity type color
    const entityTypeColor = entity.entity_type === 'machine' 
        ? 'success.main' 
        : entity.entity_type === 'drill'
        ? 'warning.main'
        : 'info.main';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: rowHeight, mb: 0.5 }}>
            {/* Entity label */}
            <Box sx={{ width: 200, flexShrink: 0, pr: 1 }}>
                <Tooltip
                    title={
                        <Box>
                            <Typography variant="body2">{entity.label}</Typography>
                            {entity.source && (
                                <Typography variant="caption" display="block">
                                    From: {entity.source.label}
                                </Typography>
                            )}
                            {entity.sink && (
                                <Typography variant="caption" display="block">
                                    To: {entity.sink.label}
                                </Typography>
                            )}
                            <Typography variant="caption" display="block">
                                Transitions: {transitionCount}
                            </Typography>
                            <Typography variant="caption" display="block">
                                Initial: {getStatusLabel(entity.initial_status)}
                            </Typography>
                        </Box>
                    }
                    arrow
                    placement="left"
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FactorioIcon name={iconName} size={18} />
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{
                                fontSize: '0.75rem',
                                color: entityTypeColor,
                            }}
                        >
                            {entity.label}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '0.65rem',
                                color: 'text.secondary',
                                bgcolor: 'action.selected',
                                px: 0.5,
                                borderRadius: 0.5,
                            }}
                        >
                            {transitionCount}
                        </Typography>
                        {/* Show item icons for associated items */}
                        {entity.items.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.25, ml: 0.5 }}>
                                {entity.items.map(item => (
                                    <FactorioIcon key={item} name={item} size={14} />
                                ))}
                            </Box>
                        )}
                    </Box>
                </Tooltip>
            </Box>

            {/* Timeline bar */}
            <Box
                sx={{
                    flex: 1,
                    height: rowHeight,
                    position: 'relative',
                    bgcolor: 'action.hover',
                    borderRadius: 0.5,
                }}
            >
                {entity.transitions.map((transition, idx) => (
                    <StatusBar
                        key={`${entity.entity_id}-${idx}`}
                        transition={transition}
                        totalDuration={totalDuration}
                        rowHeight={rowHeight}
                        entityType={entity.entity_type}
                        viewMode={viewMode}
                    />
                ))}
            </Box>
        </Box>
    );
}

interface LegendProps {
    viewMode: ViewMode;
    filters: EntityFilters;
}

function Legend({ viewMode, filters }: LegendProps) {
    const items: { label: string; color: string }[] = [];

    if (viewMode === 'simplified') {
        // Category legend
        Object.entries(CATEGORY_COLORS).forEach(([category, color]) => {
            items.push({ label: getCategoryLabel(category as StatusCategory), color });
        });
    } else {
        // Detailed status legend - show relevant statuses based on filters
        if (filters.machine) {
            Object.entries(MACHINE_STATUS_COLORS).forEach(([status, color]) => {
                items.push({ label: `Machine: ${getStatusLabel(status)}`, color });
            });
        }
        if (filters.inserter) {
            Object.entries(INSERTER_STATUS_COLORS).forEach(([status, color]) => {
                items.push({ label: `Inserter: ${getStatusLabel(status)}`, color });
            });
        }
        if (filters.drill) {
            Object.entries(DRILL_STATUS_COLORS).forEach(([status, color]) => {
                items.push({ label: `Drill: ${getStatusLabel(status)}`, color });
            });
        }
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {items.map(({ label, color }) => (
                <Box
                    key={label}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            bgcolor: color,
                            borderRadius: 0.25,
                        }}
                    />
                    <Typography variant="caption">{label}</Typography>
                </Box>
            ))}
        </Box>
    );
}

export function StateTransitionTimeline({ stateTransitionHistory }: StateTransitionTimelineProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('simplified');
    const [sortMode, setSortMode] = useState<SortMode>('byType');
    const [filters, setFilters] = useState<EntityFilters>({
        inserter: true,
        machine: true,
        drill: true,
    });
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

    const rowHeight = 24;
    const totalDuration = stateTransitionHistory.total_duration_ticks;

    // Filter entities
    const filteredEntities = useMemo(() => {
        return stateTransitionHistory.entities.filter(entity => {
            if (entity.entity_type === 'inserter' && !filters.inserter) return false;
            if (entity.entity_type === 'machine' && !filters.machine) return false;
            if (entity.entity_type === 'drill' && !filters.drill) return false;
            return true;
        });
    }, [stateTransitionHistory.entities, filters]);

    // Sort entities
    const sortedEntities = useMemo(() => {
        return sortMode === 'byRelationship'
            ? sortByRelationship(filteredEntities)
            : sortByType(filteredEntities);
    }, [filteredEntities, sortMode]);

    // Group entities by type for "by type" view
    const { machines, inserters, drills } = useMemo(() => {
        const machines = sortedEntities.filter(e => e.entity_type === 'machine');
        const inserters = sortedEntities.filter(e => e.entity_type === 'inserter');
        const drills = sortedEntities.filter(e => e.entity_type === 'drill');
        return { machines, inserters, drills };
    }, [sortedEntities]);

    // Calculate tick markers
    const tickMarkers: number[] = [];
    const markerInterval = Math.ceil(totalDuration / 10 / 100) * 100;
    for (let tick = 0; tick <= totalDuration; tick += markerInterval) {
        tickMarkers.push(tick);
    }

    const handleViewModeChange = (_: React.MouseEvent, newMode: ViewMode | null) => {
        if (newMode) setViewMode(newMode);
    };

    const handleSortModeChange = (_: React.MouseEvent, newMode: SortMode | null) => {
        if (newMode) setSortMode(newMode);
    };

    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleFilterChange = (entityType: keyof EntityFilters) => {
        setFilters(prev => ({ ...prev, [entityType]: !prev[entityType] }));
    };

    const timelineContent = (isFullscreen: boolean) => (
        <>
            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* View Mode */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Visibility sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        size="small"
                    >
                        <ToggleButton value="simplified">Simplified</ToggleButton>
                        <ToggleButton value="detailed">Detailed</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Sort Mode */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Sort sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <ToggleButtonGroup
                        value={sortMode}
                        exclusive
                        onChange={handleSortModeChange}
                        size="small"
                    >
                        <ToggleButton value="byType">By Type</ToggleButton>
                        <ToggleButton value="byRelationship">By Flow</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Filter */}
                <Box>
                    <Tooltip title="Filter entity types">
                        <IconButton onClick={handleFilterClick} size="small">
                            <FilterList />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={filterAnchorEl}
                        open={Boolean(filterAnchorEl)}
                        onClose={handleFilterClose}
                    >
                        <MenuItem onClick={() => handleFilterChange('machine')}>
                            <FormControlLabel
                                control={<Checkbox checked={filters.machine} />}
                                label="Machines"
                            />
                        </MenuItem>
                        <MenuItem onClick={() => handleFilterChange('inserter')}>
                            <FormControlLabel
                                control={<Checkbox checked={filters.inserter} />}
                                label="Inserters"
                            />
                        </MenuItem>
                        <MenuItem onClick={() => handleFilterChange('drill')}>
                            <FormControlLabel
                                control={<Checkbox checked={filters.drill} />}
                                label="Drills"
                            />
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* Legend */}
            <Legend viewMode={viewMode} filters={filters} />

            {/* Tick markers */}
            <Box sx={{ display: 'flex', mb: 0.5 }}>
                <Box sx={{ width: 200, flexShrink: 0 }} />
                <Box sx={{ flex: 1, position: 'relative', height: 20 }}>
                    {tickMarkers.map(tick => (
                        <Typography
                            key={tick}
                            variant="caption"
                            sx={{
                                position: 'absolute',
                                left: `${(tick / totalDuration) * 100}%`,
                                transform: 'translateX(-50%)',
                                color: 'text.secondary',
                                fontSize: '0.65rem',
                            }}
                        >
                            {tick}
                        </Typography>
                    ))}
                </Box>
            </Box>

            {/* Timeline content */}
            {sortMode === 'byType' ? (
                <>
                    {/* Machines section */}
                    {machines.length > 0 && filters.machine && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Machines ({machines.length})
                            </Typography>
                            {machines.map(entity => (
                                <EntityRow
                                    key={entity.entity_id}
                                    entity={entity}
                                    totalDuration={totalDuration}
                                    rowHeight={isFullscreen ? 32 : rowHeight}
                                    viewMode={viewMode}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Inserters section */}
                    {inserters.length > 0 && filters.inserter && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Inserters ({inserters.length})
                            </Typography>
                            {inserters.map(entity => (
                                <EntityRow
                                    key={entity.entity_id}
                                    entity={entity}
                                    totalDuration={totalDuration}
                                    rowHeight={isFullscreen ? 32 : rowHeight}
                                    viewMode={viewMode}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Drills section */}
                    {drills.length > 0 && filters.drill && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Mining Drills ({drills.length})
                            </Typography>
                            {drills.map(entity => (
                                <EntityRow
                                    key={entity.entity_id}
                                    entity={entity}
                                    totalDuration={totalDuration}
                                    rowHeight={isFullscreen ? 32 : rowHeight}
                                    viewMode={viewMode}
                                />
                            ))}
                        </Box>
                    )}
                </>
            ) : (
                // By relationship - show all sorted entities together
                <Box>
                    {sortedEntities.map(entity => (
                        <EntityRow
                            key={entity.entity_id}
                            entity={entity}
                            totalDuration={totalDuration}
                            rowHeight={isFullscreen ? 32 : rowHeight}
                            viewMode={viewMode}
                        />
                    ))}
                </Box>
            )}
        </>
    );

    return (
        <>
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6">
                        State Transition Timeline
                    </Typography>
                    <Tooltip title="Open fullscreen">
                        <IconButton onClick={() => setIsModalOpen(true)} size="small">
                            <Fullscreen />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Total simulation duration: {totalDuration} ticks ({(totalDuration / 60).toFixed(1)} seconds)
                </Typography>

                {timelineContent(false)}
            </Paper>

            {/* Fullscreen Modal */}
            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth={false}
                fullScreen
                PaperProps={{
                    sx: {
                        bgcolor: 'background.default',
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h5" component="span">
                            State Transition Timeline
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }} component="span">
                            {totalDuration} ticks ({(totalDuration / 60).toFixed(1)} seconds)
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setIsModalOpen(false)} edge="end">
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ overflow: 'auto' }}>
                    {timelineContent(true)}
                </DialogContent>
            </Dialog>
        </>
    );
}
