// src/components/ColonistsOverviewTab.tsx
import React from 'react';
import { ColonistDetailed } from '../types';
import { selectAndViewColonist } from '../services/rimworldApi';
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
import './ColonistsOverviewTab.css';

interface ColonistsOverviewTabProps {
    colonistsDetailed?: ColonistDetailed[];
    loading?: boolean;
}

const ColonistsOverviewTab: React.FC<ColonistsOverviewTabProps> = ({
    colonistsDetailed = [],
    loading = false
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');

    interface FilterOption {
        value: string;
        label: string;
        type: 'trait' | 'skill' | 'job';
    }

    const availableTraits = React.useMemo(() => {
        const traits = new Set<string>();
        colonistsDetailed.forEach(colonist => {
            colonist.colonist_work_info.traits.forEach(trait => {
                traits.add(trait);
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
    const [skillFilter, setSkillFilter] = React.useState<string[]>([]);
    const [jobFilter, setJobFilter] = React.useState<string[]>([]);

    // Add this function to handle custom filtering
    const filteredData = React.useMemo(() => {
        if (!colonistsDetailed.length) return [];

        return colonistsDetailed.filter(colonist => {
            // Trait filter
            if (traitFilter.length > 0) {
                const colonistTraits = colonist.colonist_work_info.traits;
                const hasMatchingTrait = traitFilter.some(trait =>
                    colonistTraits.includes(trait)
                );
                if (!hasMatchingTrait) return false;
            }

            // Skill filter
            if (skillFilter.length > 0) {
                const colonistSkills = colonist.colonist_work_info.skills;
                const hasMatchingSkill = skillFilter.some(skillName => {
                    const skill = colonistSkills.find(s => s.name === skillName);
                    return skill && skill.level > 0;
                });
                if (!hasMatchingSkill) return false;
            }

            // Job filter
            if (jobFilter.length > 0) {
                const currentJob = colonist.colonist_work_info.current_job;
                const hasWorkPriority = colonist.colonist_work_info.work_priorities.some(
                    wp => jobFilter.includes(wp.work_type) && wp.priority > 0
                );
                if (!jobFilter.includes(currentJob) && !hasWorkPriority) return false;
            }

            return true;
        });
    }, [colonistsDetailed, traitFilter, skillFilter, jobFilter]);


    // Define columns for the table
    const columns = React.useMemo<ColumnDef<ColonistDetailed>[]>(
        () => [
            {
                accessorKey: 'colonist.name',
                header: 'Colonist',
                cell: ({ row }) => {
                    const colonist = row.original.colonist;
                    const traits = row.original.colonist_work_info.traits;
                    return (
                        <div className="colonist-info">
                            <div className="colonist-name-row">
                                <span className="colonist-name">{colonist.name}</span>
                                {traits.length > 0 && (
                                    <div className="traits-tooltip">
                                        <span className="traits-icon">🧬</span>
                                        <div className="traits-popup">
                                            {traits.map((trait, index) => (
                                                <div key={index} className="trait-item">{trait}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="colonist-details">
                                <span className="colonist-gender">{colonist.gender}</span>
                                <span className="colonist-age">{colonist.age}y</span>
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
                                <div key={index} className="skill-chip">
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
                                ❤️
                            </button>
                            <button
                                className="action-btn inventory-btn"
                                onClick={() => handleViewInventory(row.original)}
                                title="View Inventory"
                            >
                                🎒
                            </button>
                            <button
                                className="action-btn skills-btn"
                                onClick={() => handleViewSkills(row.original)}
                                title="View Skills Details"
                            >
                                📊
                            </button>
                            <button
                                className="action-btn work-btn"
                                onClick={() => handleAssignWork(row.original)}
                                title="Assign Work"
                            >
                                ⚙️
                            </button>
                            <button
                                className="action-btn select-btn"
                                onClick={() => handleSelectColonist(row.original)}
                                title="Select in Game"
                            >
                                👁️
                            </button>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        []
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

    const handleSkillFilter = (skill: string) => {
        setSkillFilter(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
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
        setSkillFilter([]);
        setJobFilter([]);
        setGlobalFilter('');
    };

    const hasActiveFilters = traitFilter.length > 0 || skillFilter.length > 0 || jobFilter.length > 0 || globalFilter;

    const handleViewHealth = (colonist: ColonistDetailed) => {
        console.log('View health for:', colonist.colonist.name);
        // TODO: Implement health details view
    };

    const handleViewInventory = (colonist: ColonistDetailed) => {
        console.log('View inventory for:', colonist.colonist.name);
        // TODO: Implement inventory view
    };

    const handleViewSkills = (colonist: ColonistDetailed) => {
        console.log('View skills for:', colonist.colonist.name);
        // TODO: Implement skills details view
    };

    const handleAssignWork = (colonist: ColonistDetailed) => {
        console.log('Assign work for:', colonist.colonist.name);
        // TODO: Implement work assignment
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
        console.log('barWidth:', barWidth)
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
            </div>

            <div className="filter-controls">
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
                                <button onClick={() => handleTraitFilter(trait)}>×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Skills:</label>
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                handleSkillFilter(e.target.value);
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
                    <div className="active-filters">
                        {skillFilter.map(skill => (
                            <span key={skill} className="active-filter-tag">
                                {SKILL_OPTIONS.find(s => s.value === skill)?.label || skill}
                                <button onClick={() => handleSkillFilter(skill)}>×</button>
                            </span>
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
                                <button onClick={() => handleJobFilter(job)}>×</button>
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