// src/components/WorkTab.tsx
import React from 'react';
import { ColonistDetailed, Skill as SkillType } from '../types';
import './WorkTab.css';
import OverflowManagementModal from './OverflowManagementModal';
import { useImageCache } from './ImageCacheContext';

interface WorkTabProps {
    colonistsDetailed?: ColonistDetailed[];
    loading?: boolean;
    selectedColonist?: ColonistDetailed; // For navigation from overview
}

type WorkType = {
    id: string;
    name: string;
    icon: string;
    category: string;
};

type Assignment = {
    colonist: ColonistDetailed['colonist'];
    priority: number;
    skills: ColonistDetailed['colonist_work_info']['skills'];
    detailed?: ColonistDetailed; // store reference for traits/other lookups
};

const WORK_TYPES: WorkType[] = [
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

// Work type -> relevant skill(s)
// (easy to tweak later; hauling/cleaning/patient/firefighter have no direct skill in vanilla)
const WORKTYPE_TO_SKILLS: Record<string, string[]> = {
    doctor: ['Medicine'],
    construction: ['Construction'],
    mining: ['Mining'],
    growing: ['Plants', 'Growing'], // support either key
    cooking: ['Cooking'],
    research: ['Intellectual'],
    warden: ['Social'],
    handling: ['Animals'],
    crafting: ['Crafting'],
    smithing: ['Crafting'],
    tailoring: ['Crafting'],
    art: ['Artistic'],
    // firefighter/patient/hauling/cleaning: no skill
};

const LOW_SKILL_THRESHOLD = 3; // highlight when skill <= 3

const WorkTab: React.FC<WorkTabProps> = ({
    colonistsDetailed = [],
    loading = false,
    selectedColonist
}) => {
    const [assignments, setAssignments] = React.useState<Record<string, Assignment[]>>({});
    const [showOverflowModal, setShowOverflowModal] = React.useState(false);
    const [selectedWorkType, setSelectedWorkType] = React.useState<WorkType | null>(null);
    const [selectedColonists, setSelectedColonists] = React.useState<Assignment[]>([]);

    const [searchQuery, setSearchQuery] = React.useState('');

    const { imageCache, fetchColonistImage } = useImageCache();

    const handleOverflowClick = (workType: WorkType, list: Assignment[]) => {
        setSelectedWorkType(workType);
        setSelectedColonists(list);
        setShowOverflowModal(true);
    };
    React.useEffect(() => {
        const detailedById = new Map<number, ColonistDetailed>();
        colonistsDetailed.forEach(cd => detailedById.set(cd.colonist.id, cd));

        const initial: Record<string, Assignment[]> = {};
        WORK_TYPES.forEach(work => { initial[work.id] = []; });

        colonistsDetailed.forEach(cd => {
            cd.colonist_work_info.work_priorities.forEach(wp => {
                if (wp.priority > 0) {
                    const workType = WORK_TYPES.find(w => w.name === wp.work_type);
                    if (workType) {
                        initial[workType.id].push({
                            colonist: cd.colonist,
                            priority: wp.priority,
                            skills: cd.colonist_work_info.skills,
                            detailed: detailedById.get(cd.colonist.id),
                        });
                        fetchColonistImage?.(String(cd.colonist.id)).catch(() => void 0);
                    }
                }
            });
        });

        setAssignments(initial);
    }, [colonistsDetailed, fetchColonistImage]);

    // --- filtering helpers ---
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filterAssignmentsForWork = React.useCallback((
        list: Assignment[],
        workTypeName: string
    ): { matchesCard: boolean; filtered: Assignment[] } => {
        if (!normalizedQuery) {
            return { matchesCard: true, filtered: list };
        }
        const workNameMatches = workTypeName.toLowerCase().includes(normalizedQuery);
        const filteredByColonist = list.filter(a =>
            a.colonist.name.toLowerCase().includes(normalizedQuery)
        );
        const matchesCard = workNameMatches || filteredByColonist.length > 0;
        const filtered = workNameMatches ? list : filteredByColonist;
        return { matchesCard, filtered };
    }, [normalizedQuery]);


    // Initialize assignments from colonists data
    React.useEffect(() => {
        const detailedById = new Map<number, ColonistDetailed>();
        colonistsDetailed.forEach(cd => detailedById.set(cd.colonist.id, cd));

        const initial: Record<string, Assignment[]> = {};
        WORK_TYPES.forEach(work => { initial[work.id] = []; });

        colonistsDetailed.forEach(cd => {
            cd.colonist_work_info.work_priorities.forEach(wp => {
                if (wp.priority > 0) {
                    const workType = WORK_TYPES.find(w => w.name === wp.work_type);
                    if (workType) {
                        initial[workType.id].push({
                            colonist: cd.colonist,
                            priority: wp.priority,
                            skills: cd.colonist_work_info.skills,
                            detailed: detailedById.get(cd.colonist.id),
                        });
                        // Warm the portrait cache in background
                        fetchColonistImage?.(String(cd.colonist.id)).catch(() => void 0);
                    }
                }
            });
        });

        setAssignments(initial);
    }, [colonistsDetailed, fetchColonistImage]);

    const handlePriorityChange = (workTypeId: string, colonistId: number, newPriority: number) => {
        // Placeholder for future API integration
        console.log(`Change priority for colonist ${colonistId} in ${workTypeId} to ${newPriority}`);
        setAssignments(prev => ({
            ...prev,
            [workTypeId]: prev[workTypeId].map(a =>
                a.colonist.id === colonistId ? { ...a, priority: newPriority } : a
            )
        }));
    };

    const handleAddColonist = (workTypeId: string) => {
        console.log(`Add colonist to ${workTypeId}`);
    };

    const handleRemoveColonist = (workTypeId: string, colonistId: number) => {
        setAssignments(prev => ({
            ...prev,
            [workTypeId]: prev[workTypeId].filter(a => a.colonist.id !== colonistId)
        }));
    };

    const handleOptimizeBySkills = () => {
        console.log('Optimizing work assignments by skills...');
        // future: deterministic assignment using WORKTYPE_TO_SKILLS
    };

    const handleSetDefaultPriorities = () => {
        console.log('Setting default priorities for skilled colonists...');
        // future: set priority 3 where skill > 5
    };

    return (
        <div className="work-tab">
            <div className="work-tab-header">
                <h3>⚙️ Work Priorities (🚧 Still Work In Progress)</h3>
                <div className="work-stats">
                    <span className="stat">{WORK_TYPES.length} Work Types</span>
                    <span className="stat">{Object.values(assignments).flat().length} Assignments</span>
                </div>
            </div>

            <div className="work-controls" onClick={(e) => e.stopPropagation()}>
                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search work or colonists…"
                        aria-label="Search work types or colonists"
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                            title="Clear"
                        >
                            ×
                        </button>
                    )}
                </div>

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
            </div>

            <div className="work-grid">
                {WORK_TYPES
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(workType => {
                        const list = (assignments[workType.id] || []);
                        const sorted = sortAssignmentsBySkill(list, workType.id);

                        // apply search filtering to the sorted list
                        const { matchesCard, filtered } = filterAssignmentsForWork(sorted, workType.name);
                        if (!matchesCard) return null;

                        const isHighlighted = !!(selectedColonist &&
                            list.some(a => a.colonist.id === selectedColonist.colonist.id));

                        return (
                            <WorkTypeCard
                                key={workType.id}
                                workType={workType}
                                // PASS the filtered (and sorted) assignments
                                assignments={filtered}
                                onPriorityChange={handlePriorityChange}
                                onAddColonist={handleAddColonist}
                                onRemoveColonist={handleRemoveColonist}
                                onOverflowClick={handleOverflowClick}
                                isHighlighted={isHighlighted}
                                imageCache={imageCache as Record<string, string | undefined>}
                                fetchColonistImage={(id) => fetchColonistImage ? fetchColonistImage(String(id)) : Promise.resolve()}
                            />
                        );
                    })}
            </div>

            {showOverflowModal && selectedWorkType && (
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

// ---------- helpers ----------

function getRelevantSkillNamesForWorkType(workTypeId: string): string[] {
    return WORKTYPE_TO_SKILLS[workTypeId] || [];
}

function getSkillLevel(skills: SkillType[] | undefined, names: string[]): number | null {
    if (!skills || names.length === 0) return null;
    let best: number | null = null;
    for (const n of names) {
        const s = skills.find(sk => sk.name === n || sk.skill === n); // be permissive
        if (s) {
            best = best === null ? s.level : Math.max(best, s.level);
        }
    }
    return best;
}

function isWorkTypeDisabledByTraits(_detailed: ColonistDetailed | undefined, _workTypeId: string): boolean {
    // Placeholder for future dev: inspect detailed.colonist_work_info.traits for incapabilities (e.g., "Incapable of Violence")
    // return true/false accordingly.
    return false;
}

function sortAssignmentsBySkill(list: Assignment[], workTypeId: string): Assignment[] {
    const skills = getRelevantSkillNamesForWorkType(workTypeId);
    if (skills.length === 0) return [...list]; // nothing to sort by
    return [...list].sort((a, b) => {
        const la = getSkillLevel(a.skills, skills);
        const lb = getSkillLevel(b.skills, skills);
        // nulls treated as worst
        const va = la === null ? -1 : la;
        const vb = lb === null ? -1 : lb;
        return va - vb; // ascending -> least qualified first
    });
}

// ---------- Work Type Card ----------

interface WorkTypeCardProps {
    workType: WorkType;
    assignments: Assignment[];
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onAddColonist: (workTypeId: string) => void;
    onRemoveColonist: (workTypeId: string, colonistId: number) => void;
    onOverflowClick: (workType: WorkType, assignments: Assignment[]) => void;
    isHighlighted?: boolean;
    imageCache: Record<string, string | undefined>;
    fetchColonistImage?: (colonistId: string) => Promise<void>;
}

const WorkTypeCard: React.FC<WorkTypeCardProps> = ({
    workType,
    assignments,
    onPriorityChange,
    onAddColonist,
    onRemoveColonist,
    onOverflowClick,
    isHighlighted = false,
    imageCache,
    fetchColonistImage
}) => {
    const maxColonists = 8; // 2x4 grid
    const count = assignments.length;

    return (
        <div
            className={`work-type-card ${isHighlighted ? 'highlighted' : ''}`}
            onClick={() => onOverflowClick(workType, assignments)}
            role="button"
            aria-label={`${workType.name} card; ${count} assigned`}
        >
            {/* Work Type Header + count pill */}
            <div className="work-type-header">
                <span className="work-icon">{workType.icon}</span>
                <span className="work-name">{workType.name}</span>
                <span className="work-count-pill" aria-label="assigned count">{count}</span>
            </div>

            {/* Colonist Cards Grid */}
            <div className="colonist-cards-grid">
                {assignments.slice(0, maxColonists - 1).map((assignment) => (
                    <ColonistAssignmentCard
                        key={assignment.colonist.id}
                        assignment={assignment}
                        workTypeId={workType.id}
                        onPriorityChange={onPriorityChange}
                        onRemove={() => onRemoveColonist(workType.id, assignment.colonist.id)}
                        imageUrl={imageCache[String(assignment.colonist.id)]}
                        ensureImage={() =>
                            fetchColonistImage ? fetchColonistImage(String(assignment.colonist.id)) : Promise.resolve()
                        }
                    />
                ))}

                {/* Add button - always show if there's space */}
                {(assignments.length < maxColonists) && (
                    <button
                        className="add-colonist-card"
                        onClick={(e) => { e.stopPropagation(); onAddColonist(workType.id); }}
                        title={`Add colonist to ${workType.name}`}
                        aria-label={`Add colonist to ${workType.name}`}
                    >
                        +
                    </button>
                )}
            </div>

            {/* Overflow indicator */}
            {assignments.length > maxColonists - 1 && (
                <button
                    className="overflow-indicator"
                    onClick={(e) => { e.stopPropagation(); onOverflowClick(workType, assignments); }}
                    title={`Manage all ${assignments.length} colonists`}
                >
                    +{assignments.length - (maxColonists - 1)} more
                </button>
            )}
        </div>
    );
};

// ---------- Colonist Assignment Card ----------

interface ColonistAssignmentCardProps {
    assignment: Assignment;
    workTypeId: string;
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onRemove: () => void;
    imageUrl?: string;
    ensureImage: () => Promise<void>;
}

const ColonistAssignmentCard: React.FC<ColonistAssignmentCardProps> = ({
    assignment,
    workTypeId,
    onPriorityChange,
    onRemove,
    imageUrl,
    ensureImage
}) => {
    const relevantSkills = getRelevantSkillNamesForWorkType(workTypeId);
    const level = getSkillLevel(assignment.skills, relevantSkills);
    const disabledByTrait = isWorkTypeDisabledByTraits(assignment.detailed, workTypeId);

    const isLowSkill = (level ?? -1) <= LOW_SKILL_THRESHOLD && relevantSkills.length > 0 && !disabledByTrait;

    React.useEffect(() => {
        if (!imageUrl && ensureImage) {
            ensureImage().catch(() => void 0);
        }
    }, [imageUrl, ensureImage]);

    const handlePriorityClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newPriority = (assignment.priority + 1) % 10; // Cycle 0-9 (per current behavior)
        onPriorityChange(workTypeId, assignment.colonist.id, newPriority);
    };

    const priorityClass = `priority-badge priority-${assignment.priority}`;

    return (
        <div
            className={`colonist-assignment-card ${isLowSkill ? 'low-skill' : ''}`}
            title={
                disabledByTrait
                    ? 'Incapable due to trait'
                    : relevantSkills.length
                        ? `${relevantSkills.join('/')} level: ${level ?? '—'}`
                        : 'No relevant skill'
            }
            onClick={(e) => e.stopPropagation()} // don’t open modal when interacting inside
        >
            {/* Priority button */}
            <button
                className={priorityClass}
                onClick={handlePriorityClick}
                aria-label={`Change priority for ${assignment.colonist.name}`}
                title={`Priority: ${assignment.priority} (click to cycle)`}
            >
                {assignment.priority}
            </button>

            {/* Colonist Info with avatar */}
            <div className="colonist-info" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Avatar
                    name={assignment.colonist.name}
                    imageUrl={imageUrl}
                    size={28}
                />
                <div style={{ minWidth: 0 }}>
                    <div className="colonist-name">{assignment.colonist.name}</div>
                    <div className="colonist-details">
                        {assignment.colonist.gender} • {assignment.colonist.age}y
                    </div>
                </div>
            </div>

            {/* Remove button */}
            <button
                className="remove-colonist-btn"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                aria-label={`Remove ${assignment.colonist.name}`}
                title="Remove from this work type"
            >
                ×
            </button>
        </div>
    );
};

// ---------- Avatar (with fallback initials) ----------

const Avatar: React.FC<{ name: string; imageUrl?: string; size?: number; }> = ({ name, imageUrl, size = 28 }) => {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className="avatar"
                style={{ width: size, height: size }}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }
    const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div
            className="avatar avatar-fallback"
            style={{ width: size, height: size }}
            aria-hidden="true"
            onClick={(e) => e.stopPropagation()}
        >
            {initials}
        </div>
    );
};

export default WorkTab;
