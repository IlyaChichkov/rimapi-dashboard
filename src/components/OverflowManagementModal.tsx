// src/components/OverflowManagementModal.tsx
import React from 'react';
import { ColonistDetailed } from '../types';
import './OverflowManagementModal.css';

interface OverflowManagementModalProps {
    workType: any;
    colonists: any[];
    allColonists: ColonistDetailed[];
    onClose: () => void;
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onRemoveColonist: (workTypeId: string, colonistId: number) => void;
}

const OverflowManagementModal: React.FC<OverflowManagementModalProps> = ({
    workType,
    colonists,
    allColonists,
    onClose,
    onPriorityChange,
    onRemoveColonist
}) => {
    const [selectedColonist, setSelectedColonist] = React.useState<any>(null);
    const [priorityFilter, setPriorityFilter] = React.useState<number | 'all'>('all');
    const [searchTerm, setSearchTerm] = React.useState('');

    // Filter colonists based on priority and search
    const filteredColonists = React.useMemo(() => {
        let filtered = colonists;

        if (priorityFilter !== 'all') {
            filtered = filtered.filter(col => col.priority === priorityFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(col =>
                col.colonist.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [colonists, priorityFilter, searchTerm]);

    const availableColonists = React.useMemo(() => {
        // Colonists not currently assigned to this work type
        const assignedIds = new Set(colonists.map(col => col.colonist.id));
        return allColonists.filter(col => !assignedIds.has(col.colonist.id));
    }, [allColonists, colonists]);

    const handleAddColonist = (colonist: ColonistDetailed, priority: number = 1) => {
        // This would be implemented when we have the API
        console.log(`Add ${colonist.colonist.name} to ${workType.name} with priority ${priority}`);
    };

    const handleBulkPriorityChange = (newPriority: number) => {
        filteredColonists.forEach(col => {
            onPriorityChange(workType.id, col.colonist.id, newPriority);
        });
    };

    return (
        <div className="overflow-modal-overlay" onClick={onClose}>
            <div className="overflow-modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <span className="work-icon">{workType.icon}</span>
                        <h3>Manage {workType.name} Assignments</h3>
                    </div>
                    <button className="close-modal-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Left Panel - Colonists List */}
                    <div className="left-panel">
                        <div className="panel-header">
                            <h4>Assigned Colonists ({colonists.length})</h4>
                            <div className="filter-controls">
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                    className="priority-filter"
                                >
                                    <option value="all">All Priorities</option>
                                    <option value="1">Priority 1</option>
                                    <option value="2">Priority 2</option>
                                    <option value="3">Priority 3</option>
                                    <option value="4">Priority 4</option>
                                    <option value="0">Disabled</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search colonists..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>

                        <div className="colonists-list">
                            {filteredColonists.map(assignment => (
                                <ColonistListItem
                                    key={assignment.colonist.id}
                                    assignment={assignment}
                                    workType={workType} // Add this prop
                                    workTypeId={workType.id}
                                    isSelected={selectedColonist?.colonist.id === assignment.colonist.id}
                                    onSelect={setSelectedColonist}
                                    onPriorityChange={onPriorityChange}
                                    onRemove={onRemoveColonist}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Management Tools */}
                    <div className="right-panel">
                        {/* Selected Colonist Info */}
                        {selectedColonist ? (
                            <SelectedColonistInfo
                                assignment={selectedColonist}
                                workType={workType}
                                onPriorityChange={onPriorityChange}
                            />
                        ) : (
                            <div className="no-selection">
                                <div className="no-selection-icon">👆</div>
                                <p>Select a colonist to manage their assignment</p>
                            </div>
                        )}

                        {/* Bulk Operations */}
                        <div className="bulk-operations">
                            <h4>Bulk Operations</h4>
                            <div className="bulk-buttons">
                                <button
                                    className="bulk-btn high-priority"
                                    onClick={() => handleBulkPriorityChange(1)}
                                >
                                    Set All to Priority 1
                                </button>
                                <button
                                    className="bulk-btn medium-priority"
                                    onClick={() => handleBulkPriorityChange(3)}
                                >
                                    Set All to Priority 3
                                </button>
                                <button
                                    className="bulk-btn disable"
                                    onClick={() => handleBulkPriorityChange(0)}
                                >
                                    Disable All
                                </button>
                            </div>
                        </div>

                        {/* Work Type Stats */}
                        <div className="work-stats-panel">
                            <h4>Assignment Statistics</h4>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-value">{colonists.length}</span>
                                    <span className="stat-label">Total Assigned</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">
                                        {colonists.filter(c => c.priority === 1).length}
                                    </span>
                                    <span className="stat-label">Priority 1</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">
                                        {colonists.filter(c => c.priority === 0).length}
                                    </span>
                                    <span className="stat-label">Disabled</span>
                                </div>
                            </div>
                        </div>

                        {/* Add New Colonist */}
                        <div className="add-colonist-panel">
                            <h4>Add Colonist</h4>
                            <div className="available-colonists">
                                {availableColonists.slice(0, 5).map(colonist => (
                                    <button
                                        key={colonist.colonist.id}
                                        className="available-colonist-btn"
                                        onClick={() => handleAddColonist(colonist)}
                                    >
                                        {colonist.colonist.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Colonist List Item Component
const ColonistListItem: React.FC<any> = ({
    assignment,
    workType,
    workTypeId,
    isSelected,
    onSelect,
    onPriorityChange,
    onRemove
}) => {
    const handlePriorityClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newPriority = (assignment.priority + 1) % 10;
        onPriorityChange(workTypeId, assignment.colonist.id, newPriority);
    };

    const getRelevantSkillsForWork = (workType: string, skills: any[]): any[] => {
        const workSkillMapping: { [key: string]: string[] } = {
            'firefighter': ['Shooting', 'Melee'],
            'doctor': ['Medicine'],
            'construction': ['Construction'],
            'mining': ['Mining'],
            'growing': ['Plants'],
            'cooking': ['Cooking'],
            'research': ['Intellectual'],
            'warden': ['Social'],
            'handling': ['Animals'],
            'crafting': ['Crafting'],
            'art': ['Artistic'],
            'smithing': ['Crafting', 'Construction'],
            'tailoring': ['Crafting'],
            'hauling': [], // No specific skill
            'cleaning': [], // No specific skill
            'patient': [], // No specific skill
        };

        const relevantSkillNames = workSkillMapping[workType.toLowerCase()] || [];
        return skills.filter(skill =>
            relevantSkillNames.includes(skill.name) && skill.level > 0
        );
    };

    // Get relevant skills for this work type
    const relevantSkills = getRelevantSkillsForWork(workType.name, assignment.skills || []);
    const hasRelevantSkills = relevantSkills.length > 0;

    // Update the return structure in ColonistListItem component
    return (
        <div
            className={`colonist-list-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(assignment)}
        >
            {/* Main content area - takes up all available space */}
            <div className="colonist-content">
                <div className="colonist-basic-info">
                    <div className="colonist-name">{assignment.colonist.name}</div>
                    <div className="colonist-details">
                        {assignment.colonist.gender} • {assignment.colonist.age}y
                    </div>
                </div>

                {/* Relevant Skills Display - positioned below basic info */}
                {hasRelevantSkills && (
                    <div className="relevant-skills-mini">
                        {relevantSkills.slice(0, 3).map((skill: any) => (
                            <div
                                key={skill.name}
                                className={`skill-level-mini level-${getSkillLevelRange(skill.level)}`}
                                title={`${skill.name}: ${skill.level}`}
                            >
                                {skill.name}: {skill.level}
                            </div>
                        ))}
                        {relevantSkills.length > 3 && (
                            <div className="more-skills" title={`${relevantSkills.length - 3} more skills`}>
                                +{relevantSkills.length - 3}
                            </div>
                        )}
                    </div>
                )}

                {!hasRelevantSkills && (
                    <div className="no-relevant-skills">
                        No relevant skills
                    </div>
                )}
            </div>

            {/* Actions - aligned to the right */}
            <div className="list-item-actions">
                <button
                    className={`priority-badge priority-${assignment.priority}`}
                    onClick={handlePriorityClick}
                >
                    {assignment.priority === 0 ? '❌' : assignment.priority}
                </button>
                <button
                    className="remove-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(workTypeId, assignment.colonist.id);
                    }}
                >
                    Remove
                </button>
            </div>
        </div>
    );
};

// Add helper function for skill level ranges
const getSkillLevelRange = (level: number): string => {
    if (level === 0) return '0';
    if (level <= 4) return '1-4';
    if (level <= 8) return '5-8';
    if (level <= 12) return '9-12';
    if (level <= 16) return '13-16';
    return '17-20';
};


// Selected Colonist Info Component
const SelectedColonistInfo: React.FC<any> = ({
    assignment,
    workType,
    onPriorityChange
}) => {
    const skills = assignment.skills || [];
    const relevantSkills = skills.filter((skill: any) =>
        skill.level > 0 && ['Construction', 'Mining', 'Crafting', 'Plants', 'Animals', 'Medicine', 'Social', 'Intellectual'].includes(skill.name)
    );

    return (
        <div className="selected-colonist-info">
            <h4>{assignment.colonist.name}</h4>
            <div className="colonist-details">
                <div className="detail-row">
                    <span>Gender:</span>
                    <span>{assignment.colonist.gender}</span>
                </div>
                <div className="detail-row">
                    <span>Age:</span>
                    <span>{assignment.colonist.age}y</span>
                </div>
                <div className="detail-row">
                    <span>Current Priority:</span>
                    <button
                        className={`priority-badge large priority-${assignment.priority}`}
                        onClick={() => {
                            const newPriority = (assignment.priority + 1) % 10;
                            onPriorityChange(workType.id, assignment.colonist.id, newPriority);
                        }}
                    >
                        {assignment.priority === 0 ? 'Disabled' : `Priority ${assignment.priority}`}
                    </button>
                </div>
            </div>

            {relevantSkills.length > 0 && (
                <div className="relevant-skills">
                    <h5>Relevant Skills</h5>
                    <div className="skills-list">
                        {relevantSkills.map((skill: any) => (
                            <div key={skill.name} className="skill-tag">
                                {skill.name}: {skill.level}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverflowManagementModal;