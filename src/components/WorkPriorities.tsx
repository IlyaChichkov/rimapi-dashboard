// src/components/WorkPriorities.tsx
import React from 'react';
import { ColonistDetailed } from '../types';
import './WorkPriorities.css';

interface WorkPrioritiesProps {
    colonistsDetailed?: ColonistDetailed[];
    loading?: boolean;
    selectedColonistId?: number;
    onColonistSelect?: (colonistId: number) => void;
}

// Common work types in RimWorld (expand as needed)
const WORK_TYPES = [
    // Basic
    'Firefighter', 'Patient', 'PatientBedRest', 'BasicWorker',
    // Skilled
    'Doctor', 'Cook', 'Construction', 'Growing', 'Mining', 'Research', 'Smithing', 'Tailoring',
    // Handling
    'Handling', 'Taming', 'Training',
    // Social
    'Warden', 'Social',
    // Misc
    'Crafting', 'Art', 'Hauling', 'Cleaning', 'PlantCutting'
];

const WorkPriorities: React.FC<WorkPrioritiesProps> = ({
    colonistsDetailed = [],
    loading = false,
    selectedColonistId,
    onColonistSelect
}) => {
    const [priorities, setPriorities] = React.useState<Record<number, Record<string, number>>>({});
    const [filterColonist, setFilterColonist] = React.useState('');
    const [filterWorkType, setFilterWorkType] = React.useState('');

    // Initialize priorities from colonist data
    React.useEffect(() => {
        const newPriorities: Record<number, Record<string, number>> = {};

        colonistsDetailed.forEach(colonist => {
            newPriorities[colonist.colonist.id] = {};

            // Initialize all work types to 0
            WORK_TYPES.forEach(workType => {
                newPriorities[colonist.colonist.id][workType] = 0;
            });

            // Set actual priorities from data
            colonist.colonist_work_info.work_priorities.forEach(wp => {
                if (WORK_TYPES.includes(wp.work_type)) {
                    newPriorities[colonist.colonist.id][wp.work_type] = wp.priority;
                }
            });
        });

        setPriorities(newPriorities);
    }, [colonistsDetailed]);

    // Handle priority change
    const handlePriorityChange = (colonistId: number, workType: string) => {
        const currentPriority = priorities[colonistId]?.[workType] || 0;
        const newPriority = (currentPriority + 1) % 10; // Cycle 0-9

        setPriorities(prev => ({
            ...prev,
            [colonistId]: {
                ...prev[colonistId],
                [workType]: newPriority
            }
        }));

        // TODO: API call to save priority
        console.log(`Setting ${workType} priority for colonist ${colonistId} to ${newPriority}`);
    };

    // Calculate colonist statistics
    const getColonistStats = (colonistId: number) => {
        const colonistPriorities = Object.values(priorities[colonistId] || {});
        return {
            assigned: colonistPriorities.filter(p => p > 0).length,
            highPriority: colonistPriorities.filter(p => p === 1).length,
            totalWorkTypes: WORK_TYPES.length
        };
    };

    // Calculate work type statistics
    const getWorkTypeStats = (workType: string) => {
        const workPriorities = Object.values(priorities).map(col => col[workType] || 0);
        return {
            assigned: workPriorities.filter(p => p > 0).length,
            highPriority: workPriorities.filter(p => p === 1).length,
            totalColonists: colonistsDetailed.length
        };
    };

    // Filtered colonists and work types
    const filteredColonists = colonistsDetailed.filter(colonist =>
        filterColonist ? colonist.colonist.name.toLowerCase().includes(filterColonist.toLowerCase()) : true
    );

    const filteredWorkTypes = WORK_TYPES.filter(workType =>
        filterWorkType ? workType.toLowerCase().includes(filterWorkType.toLowerCase()) : true
    );

    return (
        <div className="work-priorities">
            {/* Header and Filters */}
            <div className="work-header">
                <h3>⚙️ Work Priorities</h3>
                <div className="work-controls">
                    <input
                        type="text"
                        placeholder="Filter colonists..."
                        value={filterColonist}
                        onChange={(e) => setFilterColonist(e.target.value)}
                        className="filter-input"
                    />
                    <input
                        type="text"
                        placeholder="Filter work types..."
                        value={filterWorkType}
                        onChange={(e) => setFilterWorkType(e.target.value)}
                        className="filter-input"
                    />
                </div>
            </div>

            {/* Work Priorities Table */}
            <div className="work-table-container">
                <table className="work-table">
                    <thead>
                        <tr>
                            <th className="work-table-colonist-header">Colonist</th>
                            {filteredWorkTypes.map(workType => {
                                const stats = getWorkTypeStats(workType);
                                return (
                                    <th key={workType} className="work-type-header">
                                        <div className="work-type-header-content">
                                            <div className="work-type-name">{workType}</div>
                                            <div className="work-type-stats">
                                                {stats.assigned}/{stats.totalColonists}
                                                {stats.highPriority > 0 && (
                                                    <span className="stat-high-priority"> ({stats.highPriority}🔥)</span>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredColonists.map(colonist => {
                            const stats = getColonistStats(colonist.colonist.id);
                            const isSelected = selectedColonistId === colonist.colonist.id;

                            return (
                                <tr
                                    key={colonist.colonist.id}
                                    className={`work-row ${isSelected ? 'selected-row' : ''}`}
                                    onClick={() => onColonistSelect?.(colonist.colonist.id)}
                                >
                                    {/* Colonist Info */}
                                    <td className="colonist-cell">
                                        <div className="colonist-info">
                                            <div className="colonist-name-row">
                                                <span className="colonist-name">{colonist.colonist.name}</span>
                                            </div>
                                            <div className="colonist-details">
                                                {colonist.colonist.gender} • {colonist.colonist.age}y
                                            </div>
                                            <div className="current-job">{colonist.colonist_work_info.current_job}</div>
                                        </div>
                                    </td>

                                    {/* Work Priorities */}
                                    {filteredWorkTypes.map(workType => {
                                        const priority = priorities[colonist.colonist.id]?.[workType] || 0;
                                        return (
                                            <td key={workType} className="priority-cell">
                                                <PriorityBadge
                                                    priority={priority}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent row click
                                                        handlePriorityChange(colonist.colonist.id, workType);
                                                    }}
                                                    isSelected={isSelected}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="work-legend">
                <div className="legend-title">Priority Legend:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <PriorityBadge priority={0} />
                        <span>Disabled</span>
                    </div>
                    <div className="legend-item">
                        <PriorityBadge priority={1} />
                        <span>Critical</span>
                    </div>
                    <div className="legend-item">
                        <PriorityBadge priority={2} />
                        <span>High</span>
                    </div>
                    <div className="legend-item">
                        <PriorityBadge priority={3} />
                        <span>Medium</span>
                    </div>
                    <div className="legend-item">
                        <PriorityBadge priority={4} />
                        <span>Low</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Priority Badge Component (same as before)
interface PriorityBadgeProps {
    priority: number;
    onClick?: (e: React.MouseEvent) => void;
    isSelected?: boolean;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, onClick, isSelected }) => {
    const getPriorityColor = (prio: number) => {
        switch (prio) {
            case 0: return 'disabled';
            case 1: return 'critical';
            case 2: return 'high';
            case 3: return 'medium';
            case 4: return 'low';
            default: return 'manual';
        }
    };

    const getPriorityLabel = (prio: number) => {
        if (prio === 0) return '0';
        return prio.toString();
    };

    return (
        <button
            className={`priority-badge ${getPriorityColor(priority)} ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
            disabled={!onClick}
            title={`Priority ${priority} - Click to change`}
        >
            {getPriorityLabel(priority)}
        </button>
    );
};

export default WorkPriorities;