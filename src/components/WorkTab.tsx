// src/components/WorkTab.tsx
import React from 'react';
import { ColonistDetailed } from '../types';
import './WorkTab.css';
import OverflowManagementModal from './OverflowManagementModal';

interface WorkTabProps {
    colonistsDetailed?: ColonistDetailed[];
    loading?: boolean;
    selectedColonist?: ColonistDetailed; // For navigation from overview
}

// Mock work types data - will be replaced with real API data
const WORK_TYPES = [
    { id: 'firefighter', name: 'Firefighter', icon: '🔥', category: 'defense' },
    { id: 'patient', name: 'Patient', icon: '🛏️', category: 'health' },
    { id: 'doctor', name: 'Doctor', icon: '🏥', category: 'health' },
    { id: 'construction', name: 'Construction', icon: '🏗️', category: 'production' },
    { id: 'mining', name: 'Mining', icon: '⛏️', category: 'production' },
    { id: 'growing', name: 'Growing', icon: '🌱', category: 'agriculture' },
    { id: 'cooking', name: 'Cooking', icon: '👨‍🍳', category: 'agriculture' },
    { id: 'research', name: 'Research', icon: '🔬', category: 'research' },
    { id: 'warden', name: 'Warden', icon: '👮', category: 'social' },
    { id: 'handling', name: 'Handling', icon: '🐾', category: 'agriculture' },
    { id: 'crafting', name: 'Crafting', icon: '🛠️', category: 'production' },
    { id: 'art', name: 'Art', icon: '🎨', category: 'production' },
    { id: 'smithing', name: 'Smithing', icon: '⚒️', category: 'production' },
    { id: 'tailoring', name: 'Tailoring', icon: '🧵', category: 'production' },
    { id: 'hauling', name: 'Hauling', icon: '📦', category: 'logistics' },
    { id: 'cleaning', name: 'Cleaning', icon: '🧹', category: 'logistics' },
];

const WorkTab: React.FC<WorkTabProps> = ({
    colonistsDetailed = [],
    loading = false,
    selectedColonist
}) => {
    // Mock assignments - will be replaced with real data from colonistsDetailed
    const [assignments, setAssignments] = React.useState<Record<string, any[]>>({});
    const [showOverflowModal, setShowOverflowModal] = React.useState(false);
    const [selectedWorkType, setSelectedWorkType] = React.useState<any>(null);
    const [selectedColonists, setSelectedColonists] = React.useState<any[]>([]);

    const handleOverflowClick = (workType: any, assignments: any[]) => {
        setSelectedWorkType(workType);
        setSelectedColonists(assignments);
        setShowOverflowModal(true);
    };

    // Initialize assignments from colonists data
    React.useEffect(() => {
        const initialAssignments: Record<string, any[]> = {};

        WORK_TYPES.forEach(work => {
            initialAssignments[work.id] = [];
        });

        // Populate with real data from colonistsDetailed
        colonistsDetailed.forEach(colonist => {
            colonist.colonist_work_info.work_priorities.forEach(wp => {
                if (wp.priority > 0) {
                    const workType = WORK_TYPES.find(w => w.name === wp.work_type);
                    if (workType) {
                        if (!initialAssignments[workType.id]) {
                            initialAssignments[workType.id] = [];
                        }
                        initialAssignments[workType.id].push({
                            colonist: colonist.colonist,
                            priority: wp.priority,
                            skills: colonist.colonist_work_info.skills
                        });
                    }
                }
            });
        });

        setAssignments(initialAssignments);
    }, [colonistsDetailed]);

    const handlePriorityChange = (workTypeId: string, colonistId: number, newPriority: number) => {
        // Placeholder for future API integration
        console.log(`Change priority for colonist ${colonistId} in ${workTypeId} to ${newPriority}`);

        setAssignments(prev => ({
            ...prev,
            [workTypeId]: prev[workTypeId].map(assignment =>
                assignment.colonist.id === colonistId
                    ? { ...assignment, priority: newPriority }
                    : assignment
            )
        }));
    };

    const handleAddColonist = (workTypeId: string) => {
        // Placeholder - will open modal in Phase 2
        console.log(`Add colonist to ${workTypeId}`);
    };

    const handleRemoveColonist = (workTypeId: string, colonistId: number) => {
        setAssignments(prev => ({
            ...prev,
            [workTypeId]: prev[workTypeId].filter(assignment =>
                assignment.colonist.id !== colonistId
            )
        }));
    };

    // Auto-assign functionality placeholders
    const handleOptimizeBySkills = () => {
        // Placeholder for skill-based optimization
        console.log('Optimizing work assignments by skills...');
        // Future implementation: Assign colonists to jobs where they have highest skills
    };

    const handleSetDefaultPriorities = () => {
        // Placeholder for default priority assignment
        console.log('Setting default priorities for skilled colonists...');
        // Future implementation: Set priority to 3 if pawn's skill > 5 for job
    };

    return (
        <div className="work-tab">
            <div className="work-tab-header">
                <h3>⚙️ Work Priorities</h3>
                <div className="work-stats">
                    <span className="stat">
                        {WORK_TYPES.length} Work Types
                    </span>
                    <span className="stat">
                        {Object.values(assignments).flat().length} Assignments
                    </span>
                </div>
            </div>

            {/* Auto-assign buttons */}
            <div className="auto-assign-buttons">
                <button
                    className="auto-assign-btn"
                    onClick={handleOptimizeBySkills}
                    title="Assign colonists to jobs based on their highest skills"
                >
                    Optimize By Skills
                </button>
                <button
                    className="auto-assign-btn"
                    onClick={handleSetDefaultPriorities}
                    title="Set priority to 3 for jobs where colonist has skill > 5"
                >
                    Set Default
                </button>
            </div>

            <div className="work-grid">
                {WORK_TYPES.sort((a, b) => a.name.localeCompare(b.name)).map(workType => (
                    <WorkTypeCard
                        key={workType.id}
                        workType={workType}
                        assignments={assignments[workType.id] || []}
                        onPriorityChange={handlePriorityChange}
                        onAddColonist={handleAddColonist}
                        onRemoveColonist={handleRemoveColonist}
                        onOverflowClick={handleOverflowClick}
                        isHighlighted={selectedColonist &&
                            assignments[workType.id]?.some(a => a.colonist.id === selectedColonist.colonist.id)
                        }
                    />
                ))}
            </div>

            {showOverflowModal && (
                <OverflowManagementModal
                    workType={selectedWorkType}
                    colonists={selectedColonists}
                    allColonists={colonistsDetailed}
                    onClose={() => setShowOverflowModal(false)}
                    onPriorityChange={handlePriorityChange}
                    onRemoveColonist={handleRemoveColonist}
                />
            )}
        </div>
    );
};

// Work Type Card Component
interface WorkTypeCardProps {
    workType: any;
    assignments: any[];
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onAddColonist: (workTypeId: string) => void;
    onRemoveColonist: (workTypeId: string, colonistId: number) => void;
    onOverflowClick: (workType: any, assignments: any[]) => void;
    isHighlighted?: boolean;
}


const WorkTypeCard: React.FC<WorkTypeCardProps> = ({
    workType,
    assignments,
    onPriorityChange,
    onAddColonist,
    onRemoveColonist,
    onOverflowClick,
    isHighlighted = false
}) => {
    const maxColonists = 8; // 2x4 grid

    return (
        <div className={`work-type-card ${isHighlighted ? 'highlighted' : ''}`}
            onClick={() => onOverflowClick(workType, assignments)}>
            {/* Work Type Header */}
            <div className="work-type-header">
                <span className="work-icon">{workType.icon}</span>
                <span className="work-name">{workType.name}</span>
            </div>

            {/* Colonist Cards Grid */}
            <div className="colonist-cards-grid">
                {/* Existing assignments */}
                {assignments.slice(0, maxColonists - 1).map((assignment, index) => (
                    <ColonistAssignmentCard
                        key={assignment.colonist.id}
                        assignment={assignment}
                        workTypeId={workType.id}
                        onPriorityChange={onPriorityChange}
                        onRemove={() => onRemoveColonist(workType.id, assignment.colonist.id)}
                    />
                ))}

                {/* Add button - always show if there's space */}
                {(assignments.length < maxColonists) && (
                    <button
                        className="add-colonist-card"
                        onClick={() => onAddColonist(workType.id)}
                        title={`Add colonist to ${workType.name}`}
                    >
                        +
                    </button>
                )}
            </div>

            {/* Overflow indicator */}
            {assignments.length > maxColonists - 1 && (
                <button
                    className="overflow-indicator"
                    onClick={() => onOverflowClick(workType, assignments)}
                    title={`Manage all ${assignments.length} colonists`}
                >
                    +{assignments.length - (maxColonists - 1)} more
                </button>
            )}
        </div>
    );
};

// Colonist Assignment Card Component
interface ColonistAssignmentCardProps {
    assignment: any;
    workTypeId: string;
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onRemove: () => void;
}

const ColonistAssignmentCard: React.FC<ColonistAssignmentCardProps> = ({
    assignment,
    workTypeId,
    onPriorityChange,
    onRemove
}) => {
    const handlePriorityClick = () => {
        const newPriority = (assignment.priority + 1) % 10; // Cycle 0-9
        onPriorityChange(workTypeId, assignment.colonist.id, newPriority);
    };

    return (
        <div className="colonist-assignment-card">
            {/* Colonist Info */}
            <div className="colonist-info">
                <div className="colonist-name">{assignment.colonist.name}</div>
                <div className="colonist-details">
                    {assignment.colonist.gender} • {assignment.colonist.age}y
                </div>
            </div>
        </div>
    );
};

export default WorkTab;