// src/components/OverflowManagementModal.tsx
import React from 'react';
import { ColonistDetailed, Skill as SkillType } from '../types';
import './OverflowManagementModal.css';
import { useImageCache } from './ImageCacheContext';

interface OverflowManagementModalProps {
    workType: { id: string; name: string; icon: string };
    colonists: any[]; // assignments: { colonist, priority, skills, detailed? }
    allColonists: ColonistDetailed[];
    onClose: () => void;
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onRemoveColonist: (workTypeId: string, colonistId: number) => void;
}

// --- mapping borrowed from WorkTab for consistency ---
const WORKTYPE_TO_SKILLS: Record<string, string[]> = {
    doctor: ['Medicine'],
    construction: ['Construction'],
    mining: ['Mining'],
    growing: ['Plants', 'Growing'],
    cooking: ['Cooking'],
    research: ['Intellectual'],
    warden: ['Social'],
    handling: ['Animals'],
    crafting: ['Crafting'],
    smithing: ['Crafting'],
    tailoring: ['Crafting'],
    art: ['Artistic'],
    // firefighter/patient/hauling/cleaning: no direct skill
};

function getRelevantSkillNamesForWorkType(workTypeId: string): string[] {
    return WORKTYPE_TO_SKILLS[workTypeId] || [];
}

function getBestSkillLevel(skills: SkillType[] | undefined, names: string[]): { level: number | null; name: string | null } {
    if (!skills || !names.length) return { level: null, name: null };
    let best: { level: number; name: string } | null = null;
    for (const n of names) {
        const s = skills.find(sk => sk.name === n || (sk as any).skill === n);
        if (s) {
            if (!best || s.level > best.level) best = { level: s.level, name: s.name || (s as any).skill || n };
        }
    }
    return best ? best : { level: null, name: null };
}

// placeholder for future logic: decide which traits affect this work type
function getAffectingTraits(_workTypeId: string, traits: string[] | undefined): string[] {
    // TODO: wire real incapabilities/impact mapping; for now, return an empty subset
    return (traits ?? []).filter(() => false);
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
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc'); // asc = low first (default)

    const { imageCache, fetchColonistImage } = useImageCache();

    // Build available list (unchanged)
    const availableColonists = React.useMemo(() => {
        const assignedIds = new Set(colonists.map(col => col.colonist.id));
        return allColonists.filter(col => !assignedIds.has(col.colonist.id));
    }, [allColonists, colonists]);

    // Warm portraits
    React.useEffect(() => {
        colonists.forEach(a => fetchColonistImage?.(String(a.colonist.id)).catch(() => void 0));
        availableColonists.forEach(cd => fetchColonistImage?.(String(cd.colonist.id)).catch(() => void 0));
    }, [colonists, availableColonists, fetchColonistImage]);

    // Sorting by best relevant skill
    const sortedColonists = React.useMemo(() => {
        const names = getRelevantSkillNamesForWorkType(workType.id);
        if (!names.length) return colonists.slice();
        const list = colonists.slice().sort((a, b) => {
            const A = getBestSkillLevel(a.skills, names).level ?? -1;
            const B = getBestSkillLevel(b.skills, names).level ?? -1;
            return sortDir === 'asc' ? A - B : B - A;
        });
        return list;
    }, [colonists, workType.id, sortDir]);

    const handleBulkPriorityChange = (newPriority: number) => {
        sortedColonists.forEach(col => {
            onPriorityChange(workType.id, col.colonist.id, newPriority);
        });
    };

    const handleAddColonist = (colonist: ColonistDetailed, priority: number = 1) => {
        console.log(`Add ${colonist.colonist.name} to ${workType.name} with priority ${priority}`);
        // TODO: when API available
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
                    {/* Left Panel - now with toolbar and grid */}
                    <div className="left-panel">
                        <div className="panel-header toolbar">
                            <h4>Assigned Colonists ({colonists.length})</h4>

                            {/* small sort button in the corner */}
                            <button
                                className="sort-skill-btn"
                                onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                title={sortDir === 'asc' ? 'Sort: Skill ↑ (low first)' : 'Sort: Skill ↓ (high first)'}
                                aria-label="Toggle sort by skill"
                            >
                                ⇅ Skill {sortDir === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>

                        {/* Grid of colonist cards */}
                        <div className="colonists-grid">
                            {sortedColonists.map(assignment => (
                                <ColonistGridCard
                                    key={assignment.colonist.id}
                                    assignment={assignment}
                                    workTypeId={workType.id}
                                    workTypeName={workType.name}
                                    isSelected={selectedColonist?.colonist.id === assignment.colonist.id}
                                    onSelect={setSelectedColonist}
                                    onPriorityChange={onPriorityChange}
                                    onRemove={onRemoveColonist}
                                    imageUrl={imageCache[String(assignment.colonist.id)]}
                                    fetchImage={() => fetchColonistImage ? fetchColonistImage(String(assignment.colonist.id)) : Promise.resolve()}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - unchanged except it still reacts to selected colonist */}
                    <div className="right-panel">
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

// --- Grid card component ---
const ColonistGridCard: React.FC<{
    assignment: any;
    workTypeId: string;
    workTypeName: string;
    isSelected: boolean;
    onSelect: (a: any) => void;
    onPriorityChange: (workTypeId: string, colonistId: number, newPriority: number) => void;
    onRemove: (workTypeId: string, colonistId: number) => void;
    imageUrl?: string;
    fetchImage: () => Promise<void>;
}> = ({
    assignment,
    workTypeId,
    workTypeName,
    isSelected,
    onSelect,
    onPriorityChange,
    onRemove,
    imageUrl,
    fetchImage
}) => {
        const relevantNames = getRelevantSkillNamesForWorkType(workTypeId);
        const best = getBestSkillLevel(assignment.skills, relevantNames);
        const affectingTraits = getAffectingTraits(workTypeId, assignment?.detailed?.colonist_work_info?.traits ?? []);

        React.useEffect(() => {
            if (!imageUrl) fetchImage().catch(() => void 0);
        }, [imageUrl, fetchImage]);

        const handlePriorityClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            const newPriority = (assignment.priority + 1) % 10;
            onPriorityChange(workTypeId, assignment.colonist.id, newPriority);
        };

        return (
            <div
                className={`colonist-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(assignment)}
                title={best.name ? `${best.name}: ${best.level ?? '—'}` : 'No relevant skill'}
            >
                <div className="card-top">
                    <img
                        src={imageUrl}
                        alt={assignment.colonist.name}
                        className="card-portrait"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                    <div className="card-id">
                        <div className="card-name">{assignment.colonist.name}</div>
                        <div className="card-sub">{assignment.colonist.gender} • {assignment.colonist.age}y</div>
                    </div>
                </div>

                <div className="card-chips">
                    <span className="chip chip-skill">
                        {best.name ? `${best.name}: ${best.level ?? '—'}` : 'No relevant skill'}
                    </span>
                    <span
                        className={`chip chip-traits ${affectingTraits.length ? 'chip-attention' : ''}`}
                        title={
                            affectingTraits.length
                                ? `Potentially affecting: ${affectingTraits.join(', ')}`
                                : 'No known trait impact (TBD)'
                        }
                    >
                        Traits {affectingTraits.length ? `(${affectingTraits.length})` : '(—)'}
                    </span>
                </div>

                <div className="card-actions">
                    <button
                        className={`priority-badge priority-${assignment.priority}`}
                        onClick={handlePriorityClick}
                        aria-label={`Change priority for ${assignment.colonist.name}`}
                        title={`Priority: ${assignment.priority}`}
                    >
                        {assignment.priority === 0 ? '❌' : assignment.priority}
                    </button>
                    <button
                        className="remove-btn"
                        onClick={(e) => { e.stopPropagation(); onRemove(workTypeId, assignment.colonist.id); }}
                    >
                        Remove
                    </button>
                </div>
            </div>
        );
    };

// Selected Colonist Info (unchanged from your version)
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
