// src/components/ColonistsSkillsDashboard.tsx
import React from 'react';
import { ColonistDetailed } from '../types';
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
import './ColonistsSkillsDashboard.css';
import { useImageCache } from './ImageCacheContext';

interface SkillsMatrixRow {
    colonist: any;
    skills: Record<string, number>;
    passions: Record<string, number>;
    xpData: Record<string, { currentXP: number; xpForNextLevel: number }>;
    traits: string[];
    currentJob: string;
}

const PassionStar: React.FC = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 32 32"
        fill="none"
        className="passion-star"
    >
        <path
            fill="#FF6723"
            d="M26 19.34c0 6.1-5.05 11.005-11.15 10.641-6.269-.374-10.56-6.403-9.752-12.705.489-3.833 2.286-7.12 4.242-9.67.34-.445.689 3.136 1.038 2.742.35-.405 3.594-6.019 4.722-7.991a.694.694 0 0 1 1.028-.213C18.394 3.854 26 10.277 26 19.34"
        />
        <path
            fill="#FFB02E"
            d="M23 21.851c0 4.042-3.519 7.291-7.799 7.144-4.62-.156-7.788-4.384-7.11-8.739C9.07 14.012 15.48 10 15.48 10S23 14.707 23 21.851"
        />
    </svg>
);

interface MostSkilledColonist {
    colonist: {
        colonist: {
            name: string;
        };
    };
    averageSkill: number;
}

interface HighestSkillColonist {
    colonist: {
        colonist: {
            name: string;
        };
    };
    skillLevel: number;
    skillName: string;
}

interface ColonistsSkillsDashboardProps {
    colonistsDetailed?: ColonistDetailed[];
    loading?: boolean;
    filterColonist?: string;
    onClearFilter?: () => void;
}

const SKILLS_LIST = [
    'Shooting', 'Melee', 'Construction', 'Mining', 'Cooking',
    'Plants', 'Animals', 'Crafting', 'Artistic', 'Medicine',
    'Social', 'Intellectual'
];

const ColonistsSkillsDashboard: React.FC<ColonistsSkillsDashboardProps> = ({
    colonistsDetailed = [],
    loading = false,
    filterColonist = '',
    onClearFilter
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [skillFilter, setSkillFilter] = React.useState<string>('');
    const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);

    const { imageCache, fetchColonistImage } = useImageCache();
    React.useEffect(() => {
        colonistsDetailed.forEach(c => {
            const id = c.colonist?.id;
            if (id != null && !imageCache[id]) {
                fetchColonistImage(String(id));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colonistsDetailed, fetchColonistImage, imageCache]);

    const handleRowClick = (rowId: string) => {
        setSelectedRowId(selectedRowId === rowId ? null : rowId);
    };

    // Clear selection when filter changes
    React.useEffect(() => {
        setSelectedRowId(null);
    }, [filterColonist]);

    // Prepare data for skills matrix - this will update when colonistsDetailed changes
    const skillsMatrixData = React.useMemo(() => {
        console.log('Updating skills matrix data with', colonistsDetailed.length, 'colonists');
        return colonistsDetailed.map(colonist => {
            const skillsRecord: Record<string, number> = {};
            const passionsRecord: Record<string, number> = {};
            const xpRecords: Record<string, { currentXP: number; xpForNextLevel: number }> = {};

            colonist.colonist_work_info.skills.forEach(skill => {
                skillsRecord[skill.name] = skill.level;
                passionsRecord[skill.name] = skill.passion;
                xpRecords[skill.name] = {
                    currentXP: skill.xp_since_last_level || 0,
                    xpForNextLevel: skill.xp_required_for_level_up || 0
                };
            });

            return {
                colonist: colonist.colonist,
                skills: skillsRecord,
                passions: passionsRecord,
                xpData: xpRecords,
                traits: colonist.colonist_work_info.traits,
                currentJob: colonist.colonist_work_info.current_job
            };
        });
    }, [colonistsDetailed]); // This dependency ensures updates when colonistsDetailed changes

    // Reset table state when data changes to force refresh
    React.useEffect(() => {
        console.log('Skills data changed, resetting table');
        // You can reset sorting or other table state here if needed
        // table.reset() - if you want to completely reset the table
    }, [skillsMatrixData]);

    const calculateSkillStats = React.useMemo(() => {
        const stats: {
            average: Record<string, number>;
            min: Record<string, number>;
            max: Record<string, number>;
            totalColonists: number;
        } = {
            average: {},
            min: {},
            max: {},
            totalColonists: skillsMatrixData.length
        };

        SKILLS_LIST.forEach(skillName => {
            const levels = skillsMatrixData
                .map(colonist => colonist.skills[skillName] || 0)
                .filter(level => level > 0); // Only count colonists who have the skill

            if (levels.length > 0) {
                stats.average[skillName] = Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length * 10) / 10;
                stats.min[skillName] = Math.min(...levels);
                stats.max[skillName] = Math.max(...levels);
            } else {
                stats.average[skillName] = 0;
                stats.min[skillName] = 0;
                stats.max[skillName] = 0;
            }
        });

        return stats;
    }, [skillsMatrixData]);

    const summaryRows = React.useMemo(() => [
        {
            id: 'average',
            label: '📊 Average',
            type: 'average' as const,
            data: calculateSkillStats.average
        },
        {
            id: 'min',
            label: '📉 Minimum',
            type: 'min' as const,
            data: calculateSkillStats.min
        },
        {
            id: 'max',
            label: '📈 Maximum',
            type: 'max' as const,
            data: calculateSkillStats.max
        }
    ], [calculateSkillStats]);


    // Update the calculations with proper typing
    const mostSkilledColonist = React.useMemo((): MostSkilledColonist | null => {
        if (skillsMatrixData.length === 0) return null;

        let highestAverage = 0;
        let mostSkilled = skillsMatrixData[0];

        skillsMatrixData.forEach(colonist => {
            const skills = Object.values(colonist.skills);
            const averageSkill = skills.reduce((sum, level) => sum + level, 0) / skills.length;

            if (averageSkill > highestAverage) {
                highestAverage = averageSkill;
                mostSkilled = colonist;
            }
        });

        return {
            colonist: mostSkilled,
            averageSkill: highestAverage
        };
    }, [skillsMatrixData]);

    const highestSkillColonist = React.useMemo((): HighestSkillColonist | null => {
        if (skillsMatrixData.length === 0) return null;

        let highestSkill = 0;
        let bestColonist = skillsMatrixData[0];
        let bestSkillName = Object.keys(skillsMatrixData[0].skills)[0] || 'Unknown';

        skillsMatrixData.forEach(colonist => {
            Object.entries(colonist.skills).forEach(([skillName, level]) => {
                if (level > highestSkill) {
                    highestSkill = level;
                    bestColonist = colonist;
                    bestSkillName = skillName;
                }
            });
        });

        return {
            colonist: bestColonist,
            skillLevel: highestSkill,
            skillName: bestSkillName
        };
    }, [skillsMatrixData]);

    const columns = React.useMemo<ColumnDef<SkillsMatrixRow>[]>(() => [
        {
            accessorKey: 'colonist.name',
            header: 'Colonist',
            cell: ({ row }: { row: any }) => {
                const c = row.original.colonist;
                const id = c?.id;
                const imageUrl = id != null ? imageCache[id] : undefined;

                return (
                    <div className="skills-colonist-info">
                        <div className="skills-colonist-row">
                            <div className={`skills-portrait ${!imageUrl ? 'loading' : ''}`}>
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={`${c.name} portrait`}
                                        className="skills-portrait-img"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div className="skills-portrait-placeholder" aria-hidden>👤</div>
                                )}
                            </div>
                            <div className="skills-colonist-meta">
                                <div className="colonist-name">{c.name}</div>
                                <div className="colonist-details">
                                    {c.gender} • {c.age}y
                                </div>
                                <div className="current-job">{row.original.currentJob}</div>
                            </div>
                        </div>
                    </div>
                );
            },
            size: 220,
        },
        ...SKILLS_LIST.map(skillName => ({
            accessorKey: `skills.${skillName}`,
            header: skillName,
            cell: ({ row }: { row: any }) => {
                const level = row.original.skills[skillName] || 0;
                const passion = row.original.passions[skillName] || 0;

                // Get XP data directly from the row
                const xpInfo = row.original.xpData[skillName] || { currentXP: 0, xpForNextLevel: 0 };
                const currentXP = xpInfo.currentXP;
                const xpForNextLevel = xpInfo.xpForNextLevel;
                const xpProgress = xpForNextLevel > 0 ? (currentXP / xpForNextLevel) * 100 : 0;

                return (
                    <div
                        className="skill-cell"
                        data-level-range={getLevelRange(level)}
                    >
                        {/* Main Level Bar */}
                        <div
                            className="skill-level-bar"
                            style={{ '--level-percentage': (level / 20) * 100 } as React.CSSProperties}
                        >
                            <div className="skill-level-number">{level}</div>
                            <div className="aptitude-container">
                                {passion > 0 && (
                                    <div className="passion-stars">
                                        {Array.from({ length: passion }).map((_, index) => (
                                            <PassionStar key={index} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* XP Progress Bar */}
                        <div
                            className="xp-progress-bar"
                            style={{ '--xp-percentage': xpProgress } as React.CSSProperties}
                        >
                            <div className="xp-progress-fill"></div>
                        </div>

                        {/* XP Text */}
                        <div className="xp-progress-text">
                            ({Math.round(currentXP)}/{Math.round(xpForNextLevel)})
                        </div>
                    </div>
                );
            },
            sortingFn: (rowA: any, rowB: any, columnId: string) => {
                const a = rowA.original.skills[skillName] || 0;
                const b = rowB.original.skills[skillName] || 0;
                return a - b;
            },
            size: 80,
        })),
    ], []);

    const filteredSkillsMatrixData = React.useMemo(() => {
        let data = skillsMatrixData;

        // Apply colonist name filter
        if (filterColonist) {
            data = data.filter(colonist =>
                colonist.colonist.name.toLowerCase().includes(filterColonist.toLowerCase())
            );
        }

        return data;
    }, [skillsMatrixData, filterColonist]);

    const table = useReactTable({
        data: filteredSkillsMatrixData,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const filteredData = React.useMemo(() => {
        if (!skillFilter) return skillsMatrixData;

        const [skillName, minLevel] = skillFilter.split(':');
        return skillsMatrixData.filter(colonist =>
            (colonist.skills[skillName] || 0) >= parseInt(minLevel)
        );
    }, [skillsMatrixData, skillFilter]);

    const getLevelRange = (level: number): string => {
        if (level === 0) return '0';
        if (level <= 4) return '1-4';
        if (level <= 8) return '5-8';
        if (level <= 12) return '9-12';
        if (level <= 16) return '13-16';
        return '17-20';
    };

    // Update table data when filtered
    React.useEffect(() => {
        if (table) {
            // Note: This is a simplified approach - you might need to use table.setGlobalFilter
            // or implement a custom filter function
        }
    }, [filteredData, table]);

    return (
        <div className="skills-dashboard">
            <div className="skills-header">
                <div className="skills-header-top">
                    <h3>🎯 Skills Matrix</h3>
                    <div className="skills-controls">
                        <input
                            type="text"
                            placeholder="Search colonists..."
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="search-input"
                        />
                        {skillFilter && (
                            <button
                                className="clear-filter-btn"
                                onClick={() => setSkillFilter('')}
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                    {filterColonist && (
                        <div className="active-colonist-filter">
                            <span className="filter-text">Showing: {filterColonist}</span>
                            <button
                                className="clear-filter-btn"
                                onClick={onClearFilter}
                                title="Show all colonists"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
                <div className="skills-controls">
                    {/* ... existing controls ... */}
                </div>
            </div>

            <div className="skills-stats">
                <div className="stat-item">
                    <span className="stat-value">{colonistsDetailed.length}</span>
                    <span className="stat-label">Colonists</span>
                </div>

                {/* Most Skilled Colonist (by average) */}
                {mostSkilledColonist && mostSkilledColonist.colonist && (
                    <div className="stat-item">
                        <span className="stat-value">
                            {mostSkilledColonist.colonist.colonist.name}
                        </span>
                        <span className="stat-label">
                            Most Skilled (Avg: {mostSkilledColonist.averageSkill.toFixed(1)})
                        </span>
                    </div>
                )}

                {/* Highest Single Skill */}
                {highestSkillColonist && highestSkillColonist.colonist && (
                    <div className="stat-item">
                        <span className="stat-value">
                            {highestSkillColonist.colonist.colonist.name}
                        </span>
                        <span className="stat-label">
                            Best {highestSkillColonist.skillName} ({highestSkillColonist.skillLevel})
                        </span>
                    </div>
                )}
            </div>

            <div className="skills-table-container">
                {skillsMatrixData.length === 0 ? (
                    <div className="no-skills-data">
                        <div className="no-data-icon">📊</div>
                        <p>No skills data available</p>
                    </div>
                ) : (
                    <table className="skills-table">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header, index) => (
                                        <th key={header.id} style={{ width: header.getSize() }}>
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'skills-sortable-header'
                                                            : '',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                        "data-level": index
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
                            {/* Summary rows */}
                            {summaryRows.map(summaryRow => (
                                <tr key={summaryRow.id} className={`summary-row ${summaryRow.type}`}>
                                    <td className="summary-label">
                                        {summaryRow.label}
                                    </td>
                                    {SKILLS_LIST.map(skillName => (
                                        <td key={skillName} className="summary-cell">
                                            <div className={`summary-value-container`}>
                                                <div className={`summary-value ${summaryRow.type}`}>
                                                    {summaryRow.data[skillName] || 0}
                                                </div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {/* Regular colonist rows */}
                            {table.getRowModel().rows.map(row => (
                                <tr
                                    key={row.id}
                                    className={`skills-row ${selectedRowId === row.id ? 'selected-row' : ''} ${selectedRowId && selectedRowId !== row.id ? 'dimmed-row' : ''}`}
                                    onClick={() => handleRowClick(row.id)}
                                >
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

            <div className="skills-legend">
                <div className="legend-title">Skill Level Colors:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="color-dot level-0"></span>
                        <span>0 (None)</span>
                    </div>
                    <div className="legend-item">
                        <span className="color-dot level-1-4"></span>
                        <span>1-4 (Beginner)</span>
                    </div>
                    <div className="legend-item">
                        <span className="color-dot level-5-8"></span>
                        <span>5-8 (Competent)</span>
                    </div>
                    <div className="legend-item">
                        <span className="color-dot level-9-12"></span>
                        <span>9-12 (Expert)</span>
                    </div>
                    <div className="legend-item">
                        <span className="color-dot level-13-16"></span>
                        <span>13-16 (Master)</span>
                    </div>
                    <div className="legend-item">
                        <span className="color-dot level-17-20"></span>
                        <span>17-20 (Grand Master)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ColonistsSkillsDashboard;