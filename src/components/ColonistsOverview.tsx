// src/components/ColonistsOverviewTab.tsx
import React from 'react';
import { Colonist, ColonistDetailed } from '../types';
import { rimworldApi, selectAndViewColonist } from '../services/rimworldApi';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table';
import './ColonistsOverview.css';
import { useImageCache } from './ImageCacheContext';

interface ColonistsOverviewProps {
    colonistsDetailed?: any[];
    loading?: boolean;
    onViewHealth?: (colonistName: string) => void;
    onViewSkills?: (colonistName: string) => void;
    onViewInventory?: (colonist: ColonistDetailed) => void;
    onViewWork?: (colonist: ColonistDetailed) => void;
}

const ColonistsOverviewTab: React.FC<ColonistsOverviewProps> = ({
    colonistsDetailed = [],
    onViewHealth = null,
    onViewSkills = null,
    onViewInventory = null,
    onViewWork = null,
    loading = false
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const { imageCache, fetchColonistImage } = useImageCache();

    interface FilterOption {
        value: string;
        label: string;
        type: 'trait' | 'skill' | 'job';
    }

    const availableTraits = React.useMemo(() => {
        const traits = new Set<string>();
        colonistsDetailed.forEach((colonist: ColonistDetailed) => {
            colonist.colonist_work_info.traits.forEach((trait) => {
                traits.add(trait.label || trait.name);
            });
        });
        return Array.from(traits).sort();
    }, [colonistsDetailed]);

    const SKILL_OPTIONS: FilterOption[] = [
        { value: 'Shooting', label: 'Shooting', type: 'skill' },
        { value: 'Melee', label: 'Melee', type: 'skill' },
        { value: 'Construction', label: 'Construction', type: 'skill' },
        { value: 'Mining', label: 'Mining', type: 'skill' },
        { value: 'Cooking', label: 'Cooking', type: 'skill' },
        { value: 'Plants', label: 'Plants', type: 'skill' },
        { value: 'Animals', label: 'Animals', type: 'skill' },
        { value: 'Crafting', label: 'Crafting', type: 'skill' },
        { value: 'Artistic', label: 'Artistic', type: 'skill' },
        { value: 'Medicine', label: 'Medicine', type: 'skill' },
        { value: 'Social', label: 'Social', type: 'skill' },
        { value: 'Intellectual', label: 'Intellectual', type: 'skill' },
    ];

    // Add these state variables inside the component, after existing states
    const [traitFilter, setTraitFilter] = React.useState<string[]>([]);
    const [jobFilter, setJobFilter] = React.useState<string[]>([]);

    interface SkillFilter {
        name: string;
        minLevel: number;
        maxLevel: number;
    }

    const [skillFilters, setSkillFilters] = React.useState<SkillFilter[]>([]);

    // Replace the handleSkillFilter function
    const handleAddSkillFilter = (skillName: string, minLevel: number = 1, maxLevel: number = 20) => {
        setSkillFilters(prev => [...prev, { name: skillName, minLevel, maxLevel }]);
    };

    const handleRemoveSkillFilter = (index: number) => {
        setSkillFilters(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateSkillFilter = (index: number, updates: Partial<SkillFilter>) => {
        setSkillFilters(prev => prev.map((filter, i) =>
            i === index ? { ...filter, ...updates } : filter
        ));
    };

    const [filtersOpen, setFiltersOpen] = React.useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('colonists_filters_open');
            return saved ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });

    React.useEffect(() => {
        try {
            localStorage.setItem('colonists_filters_open', JSON.stringify(filtersOpen));
        } catch { }
    }, [filtersOpen]);

    // counts for badge
    const activeFiltersCount =
        (traitFilter?.length || 0) +
        (jobFilter?.length || 0) +
        (skillFilters?.length || 0) +
        ((globalFilter?.trim()?.length || 0) > 0 ? 1 : 0);

    // Add this function to handle custom filtering
    const filteredData = React.useMemo(() => {
        if (!colonistsDetailed.length) return [];

        return colonistsDetailed.filter((colonist: ColonistDetailed) => {
            // Trait filter
            if (traitFilter.length > 0) {
                const colonistTraits = colonist.colonist_work_info.traits;
                const hasMatchingTrait = traitFilter.some((needle) =>
                    colonistTraits.some((t) => t.label === needle || t.name === needle)
                );
                if (!hasMatchingTrait) return false;
            }

            // Job filter
            if (jobFilter.length > 0) {
                const currentJob = colonist.colonist_work_info.current_job;
                const hasWorkPriority = colonist.colonist_work_info.work_priorities.some(
                    wp => jobFilter.includes(wp.work_type) && wp.priority > 0
                );
                if (!jobFilter.includes(currentJob) && !hasWorkPriority) return false;
            }

            // Skill filter - range based
            if (skillFilters.length > 0) {
                const colonistSkills = colonist.colonist_work_info.skills;
                const passesAllSkillFilters = skillFilters.every(skillFilter => {
                    const skill = colonistSkills.find(s => s.name === skillFilter.name);
                    if (!skill) return false; // Colonist doesn't have this skill
                    return skill.level >= skillFilter.minLevel && skill.level <= skillFilter.maxLevel;
                });
                if (!passesAllSkillFilters) return false;
            }

            return true;
        });
    }, [colonistsDetailed, traitFilter, skillFilters, jobFilter]);


    // Define columns for the table
    const columns = React.useMemo<ColumnDef<ColonistDetailed>[]>(
        () => [
            {
                accessorKey: 'colonist.name',
                header: 'Colonist',
                cell: ({ row }) => {
                    const colonist = row.original.colonist;
                    const traits = row.original.colonist_work_info.traits;
                    const imageUrl = imageCache[colonist.id];

                    return (
                        <div className="colonist-info">
                            <div className="colonist-portrait-row">
                                <div className="colonist-portrait">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={`Portrait of ${colonist.name}`}
                                            className="portrait-image"
                                        />
                                    ) : null}
                                    <div className={`portrait-placeholder ${imageUrl ? 'hidden' : ''}`}>
                                        👤
                                    </div>
                                </div>
                                <div className="colonist-details">
                                    <div className="colonist-name-row">
                                        <span className="colonist-name">{colonist.name}</span>
                                        {traits.length > 0 && (
                                            <div className="traits-tooltip">
                                                <span className="traits-icon">🧬</span>
                                                <div className="traits-popup">
                                                    {traits.map((trait, index) => (
                                                        <div key={trait.name ?? index} className="trait-item">
                                                            {typeof trait === 'string' ? trait : (trait.label || trait.name)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="colonist-meta">
                                        <span className="colonist-gender">{colonist.gender}</span>
                                        <span className="colonist-age">{colonist.age}y</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const colonist = row.original.colonist;
                    const currentJob = row.original.colonist_work_info.current_job;
                    const hasMedicalIssues = row.original.colonist_medical_info.hediffs.length > 0;

                    return (
                        <div className="status-cell">
                            <div className="current-job">{currentJob}</div>
                            {hasMedicalIssues && (
                                <button
                                    className="medical-alert-btn"
                                    title="View medical details"
                                    onClick={() => handleViewHealth(row.original)}
                                >
                                    🩺
                                </button>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'needs',
                header: 'Needs',
                cell: ({ row }) => {
                    const colonist = row.original;
                    return (
                        <div className="needs-cell">
                            <NeedBar label="Mood" value={colonist.colonist.mood} />
                            <NeedBar label="Hunger" value={colonist.colonist.hunger} />
                            <NeedBar label="Rest" value={colonist.sleep} />
                        </div>
                    );
                },
            },
            {
                accessorKey: 'skills',
                header: 'Skills',
                cell: ({ row }) => {
                    const skills = row.original.colonist_work_info.skills;
                    // Get top 4 highest level skills
                    const topSkills = skills
                        .filter(skill => skill.level > 0)
                        .sort((a, b) => b.level - a.level)
                        .slice(0, 8);

                    return (
                        <div className="skills-cell">
                            {topSkills.map((skill, index) => (
                                <div
                                    key={index}
                                    className="skill-chip"
                                    data-level={skill.level} // Add this line
                                >
                                    {skill.name}: {skill.level}
                                </div>
                            ))}
                        </div>
                    );
                },
                sortingFn: (rowA, rowB, columnId) => {
                    const skillsA = rowA.original.colonist_work_info.skills;
                    const skillsB = rowB.original.colonist_work_info.skills;

                    // Sort by highest skill level
                    const maxSkillA = Math.max(...skillsA.map(s => s.level));
                    const maxSkillB = Math.max(...skillsB.map(s => s.level));

                    return maxSkillA - maxSkillB;
                },
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const colonist = row.original.colonist;
                    return (
                        <div className="action-buttons">
                            <button
                                className="action-btn health-btn"
                                onClick={() => handleViewHealth(row.original)}
                                title="View Health Details"
                            >
                                ❤️ Health
                            </button>
                            <button
                                className="action-btn inventory-btn"
                                onClick={() => handleViewInventory(row.original)}
                                title="View Inventory"
                            >
                                🎒 Inventory
                            </button>
                            <button
                                className="action-btn skills-btn"
                                onClick={() => handleViewSkills(row.original)}
                                title="View Skills Details"
                            >
                                📊 Skills
                            </button>
                            <button
                                className="action-btn work-btn"
                                onClick={() => handleAssignWork(row.original)}
                                title="Assign Work"
                            >
                                ⚙️ Work
                            </button>
                            <button
                                className="action-btn select-btn"
                                onClick={() => handleSelectColonist(row.original)}
                                title="Select in Game"
                            >
                                👁️ View
                            </button>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [imageCache]
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    // Add these filter handler functions
    const handleTraitFilter = (trait: string) => {
        setTraitFilter(prev =>
            prev.includes(trait)
                ? prev.filter(t => t !== trait)
                : [...prev, trait]
        );
    };

    const handleJobFilter = (job: string) => {
        setJobFilter(prev =>
            prev.includes(job)
                ? prev.filter(j => j !== job)
                : [...prev, job]
        );
    };

    const clearAllFilters = () => {
        setTraitFilter([]);
        setSkillFilters([]);
        setJobFilter([]);
        setGlobalFilter('');
    };

    const hasActiveFilters = traitFilter.length > 0 || skillFilters.length > 0 || jobFilter.length > 0 || globalFilter;

    const handleViewHealth = (colonist: ColonistDetailed) => {
        console.log('View health for:', colonist.colonist.name);
        if (onViewHealth) {
            onViewHealth(colonist.colonist.name); // Call the parent function
        }
    };

    const handleViewInventory = (colonist: ColonistDetailed) => {
        if (onViewInventory) {
            onViewInventory(colonist);
        }
    };

    const handleViewSkills = (colonist: ColonistDetailed) => {
        if (onViewSkills) {
            onViewSkills(colonist.colonist.name);
        }
    }

    const handleAssignWork = (colonist: ColonistDetailed) => {
        if (onViewWork) {
            onViewWork(colonist);
        }
    };

    const handleSelectColonist = async (colonist: ColonistDetailed) => {
        try {
            await selectAndViewColonist(colonist.colonist.id, colonist.colonist.name);
        } catch (error) {
            console.error('Failed to select colonist:', error);
        }
    };

    // NeedBar component for needs display
    const NeedBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
        const barWidth = Math.max(0, Math.min(100, value * 100));
        return (
            <div className="need-bar">
                <div className="need-label">{label}:</div>
                <div className="need-bar-container">
                    <div
                        className="need-bar-fill"
                        style={{ width: `${barWidth}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="colonists-overview-tab">
            <div className="tab-header">
                <h3>👥 Colonists Overview</h3>
                <div className="header-stats">
                    <span className="colonist-count">
                        Showing: {filteredData.length}/{colonistsDetailed.length}
                    </span>
                </div>
                <div className="controls">
                    <button
                        className={`filters-toggle ${hasActiveFilters ? 'active' : ''}`}
                        aria-expanded={filtersOpen}
                        aria-controls="colonists-filter-controls"
                        onClick={() => setFiltersOpen(v => !v)}
                        title={filtersOpen ? 'Hide filters' : 'Show filters'}
                    >
                        Filters
                        {activeFiltersCount > 0 && <span className="filters-badge">{activeFiltersCount}</span>}
                        <span className="chevron" aria-hidden>{filtersOpen ? '▾' : '▸'}</span>
                    </button>
                </div>
            </div>

            <div className={`filters-collapsible ${filtersOpen ? 'open' : 'closed'}`}>
                {filtersOpen ? (<div id="colonists-filter-controls" className="filter-controls">
                    <div className="filter-group">
                        <label>Traits:</label>
                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleTraitFilter(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="filter-select"
                        >
                            <option value="">Add trait filter...</option>
                            {availableTraits.map(trait => (
                                <option key={trait} value={trait}>{trait}</option>
                            ))}
                        </select>
                        <div className="active-filters">
                            {traitFilter.map(trait => (
                                <span key={trait} className="active-filter-tag">
                                    {trait}
                                    <button onClick={() => handleTraitFilter(trait)}>❌</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Skills:</label>
                        <div className="skill-filter-controls">
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAddSkillFilter(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="filter-select"
                            >
                                <option value="">Add skill filter...</option>
                                {SKILL_OPTIONS.map(skill => (
                                    <option key={skill.value} value={skill.value}>{skill.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="active-filters">
                            {skillFilters.map((filter, index) => (
                                <div key={index} className="skill-filter-tag">
                                    <span className="skill-filter-name">{filter.name}:</span>
                                    <select
                                        value={filter.minLevel}
                                        onChange={(e) => handleUpdateSkillFilter(index, { minLevel: Number(e.target.value) })}
                                        className="level-select"
                                    >
                                        {Array.from({ length: 21 }, (_, i) => (
                                            <option key={i} value={i}>≥{i}</option>
                                        ))}
                                    </select>
                                    <span className="range-separator">-</span>
                                    <select
                                        value={filter.maxLevel}
                                        onChange={(e) => handleUpdateSkillFilter(index, { maxLevel: Number(e.target.value) })}
                                        className="level-select"
                                    >
                                        {Array.from({ length: 21 }, (_, i) => (
                                            <option key={i} value={i}>≤{i}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleRemoveSkillFilter(index)}
                                        className="remove-filter-btn"
                                    >
                                        ❌
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Jobs:</label>
                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleJobFilter(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="filter-select"
                        >
                            <option value="">Add job filter...</option>
                            <option value="FleeAndCower">Flee and Cower</option>
                            <option value="Patient">Patient</option>
                            <option value="Firefighter">Firefighter</option>
                            <option value="Doctor">Doctor</option>
                            <option value="Cooking">Cooking</option>
                            <option value="Construction">Construction</option>
                            <option value="Mining">Mining</option>
                            <option value="Growing">Growing</option>
                            <option value="Research">Research</option>
                            <option value="Warden">Warden</option>
                            <option value="Handling">Handling</option>
                            <option value="Crafting">Crafting</option>
                            <option value="Art">Art</option>
                            <option value="Smithing">Smithing</option>
                            <option value="Tailoring">Tailoring</option>
                            <option value="Hauling">Hauling</option>
                            <option value="Cleaning">Cleaning</option>
                        </select>
                        <div className="active-filters">
                            {jobFilter.map(job => (
                                <span key={job} className="active-filter-tag">
                                    {job}
                                    <button onClick={() => handleJobFilter(job)}>❌</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Search:</label>
                        <input
                            type="text"
                            placeholder="Search names, jobs..."
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button className="clear-filters-btn" onClick={clearAllFilters}>
                            Clear All Filters
                        </button>
                    )}
                </div>) : <div></div>}
            </div>

            <div className="table-container">
                {filteredData.length === 0 ? (
                    <div className="no-colonists">
                        <div className="no-colonists-icon">🔍</div>
                        <p>No colonists match your filters</p>
                        <span className="no-colonists-subtitle">
                            {colonistsDetailed.length > 0
                                ? 'Try adjusting your filters'
                                : 'No colonists data available'
                            }
                        </span>
                        {hasActiveFilters && (
                            <button className="clear-filters-btn" onClick={clearAllFilters}>
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="colonists-table">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}>
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'sortable-header'
                                                            : '',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: ' 🔼',
                                                        desc: ' 🔽',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="colonist-row">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ColonistsOverviewTab;