// src/components/MedicalAlertsCard.tsx
import React from 'react';
import { ColonistDetailed, MedicalAlert, Hediff } from '../types';
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
import './MedicalAlertsCard.css';

interface MedicalAlertsCardProps {
  colonistsDetailed?: ColonistDetailed[];
  loading?: boolean;
  initialColonistFilter?: string[];
}

// Filter chip types
type FilterChip = {
  id: string;
  type: 'colonist' | 'hediff' | 'tag' | 'bodypart' | 'severity' | 'search';
  value: string;
  label: string;
};

const MedicalAlertsCard: React.FC<MedicalAlertsCardProps> = ({
  colonistsDetailed = [],
  loading = false,
  initialColonistFilter = [],
}) => {
  // Set default sorting by severity (critical first)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'severity', desc: false }
  ]);

  // State for filters
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [filterChips, setFilterChips] = React.useState<FilterChip[]>([]);
  const [searchInput, setSearchInput] = React.useState('');

  React.useEffect(() => {
    if (initialColonistFilter.length > 0) {
      // Convert initial colonist names to filter chips
      const colonistChips = initialColonistFilter.map(colonistName => ({
        id: `colonist-${colonistName}-initial`,
        type: 'colonist' as const,
        value: colonistName,
        label: colonistName
      }));

      // Add to existing filter chips (or replace existing colonist filters)
      setFilterChips(prev => [
        ...prev.filter(chip => chip.type !== 'colonist'), // Remove existing colonist filters
        ...colonistChips
      ]);
    }
  }, [initialColonistFilter]);

  // Get unique values for filters
  const filterOptions = React.useMemo(() => {
    const names = colonistsDetailed.map(col => col.colonist.name);
    const severities = ['critical', 'serious', 'warning', 'info'] as const;

    return {
      colonists: Array.from(new Set(names)).sort(),
      severities,
      quickFilters: [
        { type: 'severity' as const, value: 'critical', label: '🚨 Critical Only' },
        { type: 'tag' as const, value: 'overall', label: '💊 Overall' },
        { type: 'tag' as const, value: 'bleeding', label: '🩸 Bleeding' },
        { type: 'tag' as const, value: 'infection', label: '🦠 Infection' },
      ]
    };
  }, [colonistsDetailed]);

  // Tag system for hediffs
  const getHediffTags = (hediff: Hediff): string[] => {
    const tags: string[] = [];

    // Example conditions - customize these as needed
    if (hediff.bleeding && hediff.bleed_rate > 0) {
      tags.push('bleeding');
    }

    if (hediff.def_name.includes('Infection') || hediff.label.toLowerCase().includes('infection')) {
      tags.push('infection');
    }

    if (hediff.def_name.includes('Fracture') || hediff.label.toLowerCase().includes('fracture')) {
      tags.push('fracture');
    }

    if (hediff.def_name.includes('Burn') || hediff.label.toLowerCase().includes('burn')) {
      tags.push('burn');
    }

    if (hediff.is_permanent) {
      tags.push('chronic');
    }

    if (hediff.is_currently_life_threatening) {
      tags.push('emergency');
    }

    if (hediff.is_tended) {
      tags.push('treated');
    }

    return tags;
  };

  // Analyze medical conditions and generate alerts using new API structure
  const medicalAlerts = React.useMemo(() => {
    const alerts: (MedicalAlert & { tags: string[] })[] = [];

    colonistsDetailed.forEach(colonist => {
      const { colonist: col, colonist_medical_info: medical } = colonist;

      // Calculate pain percentage from hediffs
      const totalPainPercent = medical.hediffs.reduce((total, hediff) => {
        return total + (hediff.pain_factor * hediff.pain_offset);
      }, 0);

      // Check for bleeding conditions
      const bleedingHediffs = medical.hediffs.filter(h => h.bleeding && h.bleed_rate > 0);
      const totalBleedRate = bleedingHediffs.reduce((total, h) => total + h.bleed_rate, 0);

      // Check specific medical conditions using new hediff properties
      medical.hediffs.forEach(hediff => {
        const severity = getHediffSeverity(hediff);
        if (severity) {
          const tags = getHediffTags(hediff);
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: hediff.label_cap || hediff.label,
            severity,
            bodyPart: hediff.part_label || 'Unknown',
            description: getHediffDescription(hediff),
            healthPercent: medical.health,
            bleedRate: hediff.bleed_rate,
            tags
          });
        }
      });

      // Check overall health
      if (medical.health < 0.25) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Critical Health',
          severity: 'critical',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(medical.health * 100)}% - Immediate medical attention required`,
          healthPercent: medical.health,
          tags: ['critical-health', 'overall']
        });
      } else if (medical.health < 0.6) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Poor Health',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(medical.health * 100)}% - Medical attention recommended`,
          healthPercent: medical.health,
          tags: ['overall']
        });
      }

      // Check for high pain levels
      if (totalPainPercent > 0.8) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Severe Pain',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `High pain level (${Math.round(totalPainPercent * 100)}%) - Pain management needed`,
          healthPercent: medical.health,
          tags: ['pain', 'overall']
        });
      } else if (totalPainPercent > 0.2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Moderate Pain',
          severity: 'warning',
          bodyPart: 'Overall',
          description: `Moderate pain level (${Math.round(totalPainPercent * 100)}%)`,
          healthPercent: medical.health,
          tags: ['pain', 'overall']
        });
      }

      if (bleedingHediffs.length > 0) {
        if (totalBleedRate > 0.5) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Severe Bleeding',
            severity: 'serious',
            bodyPart: 'Overall',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Immediate treatment required`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
            tags: ['overall']
          });
        } else if (totalBleedRate > 0.01) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Bleeding',
            severity: 'warning',
            bodyPart: 'Overall',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Treatment needed`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
            tags: ['overall']
          });
        }
      }

      const bloodLoss = medical.hediffs.find(h => h.def_name == "BloodLoss");
      const bloodLossSeverity = bloodLoss?.severity ?? 0;
      let deathDueBloodLossTime: number = 0;

      if (bloodLossSeverity > 0.01 && totalBleedRate > 0.01) {
        deathDueBloodLossTime = ((1 - bloodLossSeverity) / totalBleedRate * 24 * 60); // Convert to minutes
        console.log('deathDueBloodLossTime', deathDueBloodLossTime);

        if (deathDueBloodLossTime < 300) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'IMMINENT DEATH - Blood Loss',
            severity: 'critical',
            bodyPart: 'Circulatory',
            description: `Will die in ${Math.round(deathDueBloodLossTime)} minutes - EMERGENCY`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
            tags: ['overall', 'bloodLoss']
          });
        } else if (deathDueBloodLossTime < 600) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Critical Blood Loss',
            severity: 'critical',
            bodyPart: 'Overall',
            description: `Will die in ${Math.round(deathDueBloodLossTime / 60)} hours - Immediate treatment required`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
            tags: ['overall', 'bloodLoss']
          });
        } else if (deathDueBloodLossTime < 900) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Severe Blood Loss',
            severity: 'serious',
            bodyPart: 'Overall',
            description: `Will die in ${Math.round(deathDueBloodLossTime / 60)} hours - Urgent treatment needed`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
            tags: ['overall', 'bloodLoss']
          });
        }
      }

      // Check hunger
      if (col.hunger < 0.2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Starvation',
          severity: 'serious',
          bodyPart: 'Overall',
          description: 'Severely malnourished - Immediate food required',
          healthPercent: medical.health,
          tags: ['starvation', 'overall']
        });
      }
    });

    return alerts;
  }, [colonistsDetailed]);

  // Apply filter chips to table data
  const filteredAlerts = React.useMemo(() => {
    if (filterChips.length === 0) return medicalAlerts;

    return medicalAlerts.filter(alert => {
      return filterChips.every(chip => {
        switch (chip.type) {
          case 'colonist':
            return alert.colonistName.toLowerCase().includes(chip.value.toLowerCase());
          case 'hediff':
            return alert.condition.toLowerCase().includes(chip.value.toLowerCase());
          case 'tag':
            return alert.tags.includes(chip.value);
          case 'bodypart':
            return alert.bodyPart.toLowerCase().includes(chip.value.toLowerCase());
          case 'severity':
            return alert.severity === chip.value;
          case 'search':
            return Object.values(alert).some(val =>
              String(val).toLowerCase().includes(chip.value.toLowerCase())
            );
          default:
            return true;
        }
      });
    });
  }, [medicalAlerts, filterChips]);

  // Define columns for the table
  const columns = React.useMemo<ColumnDef<MedicalAlert & { tags: string[] }>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => {
          const severity = getValue() as string;
          return (
            <div className={`severity-badge ${severity}`}>
              {getSeverityIcon(severity)}
              <span className="severity-text">{severity.toUpperCase()}</span>
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const severityOrder = { critical: 0, serious: 1, warning: 2, info: 3 };
          const a = rowA.getValue(columnId) as keyof typeof severityOrder;
          const b = rowB.getValue(columnId) as keyof typeof severityOrder;
          return severityOrder[a] - severityOrder[b];
        },
      },
      {
        accessorKey: 'colonistName',
        header: 'Colonist',
        cell: ({ getValue }) => (
          <span className="colonist-name">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'condition',
        header: 'Condition',
        cell: ({ getValue }) => (
          <span className="condition-text">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'bodyPart',
        header: 'Body Part',
        cell: ({ getValue }) => (
          <span className="body-part">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ getValue }) => {
          const tags = getValue() as string[];
          return (
            <div className="tags-container">
              {tags.slice(0, 3).map(tag => (
                <span key={tag} className={`tag tag-${tag}`}>
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="tag-more">+{tags.length - 3}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'bleedRate',
        header: 'Bleeding',
        cell: ({ getValue }) => {
          const bleedRate = getValue() as number | undefined;

          if (bleedRate && bleedRate > 0) {
            return (
              <div className="bleeding-cell">
                <span className="bleeding-indicator">🩸</span>
                <span className="bleed-rate">{(bleedRate * 100).toFixed(1)}%/day</span>
              </div>
            );
          }

          return <span className="no-bleeding">-</span>;
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as number | undefined;
          const b = rowB.getValue(columnId) as number | undefined;

          // Treat undefined/0 as 0 for sorting
          const aValue = a || 0;
          const bValue = b || 0;

          return aValue - bValue;
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ getValue }) => (
          <span className="description-text">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'healthPercent',
        header: 'Health',
        cell: ({ getValue }) => {
          const healthPercent = getValue() as number;
          return (
            <div className="health-cell">
              <span className="health-percent">{Math.round(healthPercent * 100)}%</span>
              <div className="health-bar">
                <div
                  className={`health-bar-fill ${healthPercent < 0.3 ? 'critical' : healthPercent < 0.6 ? 'serious' : 'healthy'}`}
                  style={{ width: `${healthPercent * 100}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            className="action-btn view-btn"
            onClick={() => handleViewColonist(row.original)}
            title={`View ${row.original.colonistName}'s details`}
          >
            <span className="action-icon">👁️</span>
            <span className="action-text">View</span>
          </button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredAlerts,
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
    initialState: {
      sorting: [{ id: 'severity', desc: false }]
    },
  });

  const handleViewColonist = async (alert: MedicalAlert) => {
    try {
      await selectAndViewColonist(alert.colonistId, alert.colonistName);
    } catch (error) {
      console.error('Failed to navigate to colonist:', error);
    }
  };

  // Filter chip management
  const addFilterChip = (type: FilterChip['type'], value: string, label?: string) => {
    const chip: FilterChip = {
      id: `${type}-${value}-${Date.now()}`,
      type,
      value,
      label: label || value
    };

    setFilterChips(prev => [...prev, chip]);
    setSearchInput('');
  };

  const removeFilterChip = (chipId: string) => {
    setFilterChips(prev => prev.filter(chip => chip.id !== chipId));
  };

  const clearAllFilters = () => {
    setFilterChips([]);
    setColumnFilters([]);
    setGlobalFilter('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      addFilterChip('search', searchInput.trim());
    }
  };

  const handleQuickFilter = (type: FilterChip['type'], value: string, label: string) => {
    addFilterChip(type, value, label);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'serious':
        return '⚠️';
      case 'warning':
        return '📋';
      default:
        return 'ℹ️';
    }
  };

  // Multi-column sorting handler
  const handleHeaderClick = (header: any, event: React.MouseEvent) => {
    if (!header.column.getCanSort()) return;

    if (event.shiftKey) {
      // Multi-sort: add to existing sorts
      const currentSorts = [...sorting];
      const existingIndex = currentSorts.findIndex(s => s.id === header.column.id);

      if (existingIndex >= 0) {
        // Cycle through sort states: asc -> desc -> remove
        const currentSort = currentSorts[existingIndex];
        if (currentSort.desc) {
          currentSorts.splice(existingIndex, 1);
        } else {
          currentSorts[existingIndex] = { ...currentSort, desc: !currentSort.desc };
        }
      } else {
        // Add new sort
        currentSorts.push({ id: header.column.id, desc: false });
      }

      setSorting(currentSorts);
    } else {
      // Single sort: replace all sorts
      const currentSort = header.column.getIsSorted();
      if (currentSort === 'asc') {
        setSorting([{ id: header.column.id, desc: true }]);
      } else if (currentSort === 'desc') {
        setSorting([]);
      } else {
        setSorting([{ id: header.column.id, desc: false }]);
      }
    }
  };

  const hasActiveFilters = filterChips.length > 0 || columnFilters.length > 0 || globalFilter;

  const totalColonists = colonistsDetailed.length;
  const injuredColonists = React.useMemo(() => {
    const injuredIds = new Set(medicalAlerts.map(alert => alert.colonistId));
    return injuredIds.size;
  }, [medicalAlerts]);

  return (
    <div className="medical-alerts-card">
      <div className="medical-header">
        <h3>🩺 Medical Alerts</h3>
        <div className="alert-stats">
          {filteredAlerts.filter(a => a.severity === 'critical').length > 0 && (
            <span className="stat critical">🚨 {filteredAlerts.filter(a => a.severity === 'critical').length}</span>
          )}
          {filteredAlerts.filter(a => a.severity === 'serious').length > 0 && (
            <span className="stat serious">⚠️ {filteredAlerts.filter(a => a.severity === 'serious').length}</span>
          )}
          {filteredAlerts.filter(a => a.severity === 'warning').length > 0 && (
            <span className="stat warning">📋 {filteredAlerts.filter(a => a.severity === 'warning').length}</span>
          )}
          <span className="total-alerts">
            Injured: {injuredColonists}/{totalColonists} | Total: {filteredAlerts.length}
          </span>
        </div>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="filter-controls">
        {/* Quick Filters */}
        <div className="filter-group">
          <label>Quick Filters:</label>
          <div className="filter-buttons">
            {filterOptions.quickFilters.map(filter => (
              <button
                key={`${filter.type}-${filter.value}`}
                className="filter-btn quick-filter"
                onClick={() => handleQuickFilter(filter.type, filter.value, filter.label)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Chip Input */}
        <div className="filter-group">
          <label>Add Filter:</label>
          <form onSubmit={handleSearchSubmit} className="chip-input-container">
            <input
              type="text"
              placeholder="Type colonist, condition, tag, body part... then press Enter"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
              list="filter-suggestions"
            />
            <datalist id="filter-suggestions">
              {filterOptions.colonists.map(name => (
                <option key={name} value={`${name}`} />
              ))}
              {['critical', 'serious', 'warning', 'info'].map(severity => (
                <option key={severity} value={`${severity}`} />
              ))}
              {['bleeding', 'infection', 'fracture', 'burn', 'chronic', 'emergency'].map(tag => (
                <option key={tag} value={`${tag}`} />
              ))}
            </datalist>
            <button type="submit" className="add-chip-btn">
              Add
            </button>
          </form>
        </div>

        {/* Active Filter Chips */}
        {filterChips.length > 0 && (
          <div className="filter-group">
            <label>Active Filters:</label>
            <div className="chips-container">
              {filterChips.map(chip => (
                <div key={chip.id} className={`filter-chip chip-${chip.type}`}>
                  <span className="chip-type">{chip.type}:</span>
                  <span className="chip-value">{chip.label}</span>
                  <button
                    onClick={() => removeFilterChip(chip.id)}
                    className="chip-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={clearAllFilters} className="clear-all-chips">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="medical-content">
        {filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">🔍</div>
            <p>No alerts match your filters</p>
            <span className="no-alerts-subtitle">
              {medicalAlerts.length > 0
                ? 'Try adjusting your filters'
                : 'No medical issues detected'
              }
            </span>
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="medical-table-container">
            {/* Sort Indicators */}
            {sorting.length > 0 && (
              <div className="sort-indicators">
                <span>Sort Priority:</span>
                {sorting.map((sort, index) => (
                  <span key={sort.id} className="sort-indicator">
                    {index + 1}. {sort.id} ({sort.desc ? 'desc' : 'asc'})
                  </span>
                ))}
              </div>
            )}

            <table className="medical-table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={header.column.getCanSort() ? 'sortable-header' : ''}
                            onClick={(e) => handleHeaderClick(header, e)}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <span className="sort-indicator">
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? ' ↕️'}
                            </span>
                            {sorting.findIndex(s => s.id === header.column.id) >= 0 && (
                              <span className="sort-priority">
                                {sorting.findIndex(s => s.id === header.column.id) + 1}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={`alert-row ${row.original.severity}`}>
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
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions to analyze medical conditions
const getHediffSeverity = (hediff: Hediff): MedicalAlert['severity'] | null => {
  // Critical conditions - bleeding, high severity wounds, permanent injuries
  if (hediff.bleeding && hediff.bleed_rate > 0.5) {
    return 'critical';
  }

  if (hediff.severity > 10) {
    return 'serious';
  }

  // Serious conditions - moderate severity wounds, infections
  if (hediff.severity > 5) {
    return 'warning';
  }

  if (hediff.is_tended) {
    return 'info';
  }

  return 'warning';
};

const getHediffDescription = (hediff: Hediff): string => {
  const parts = [];

  if (hediff.severity_label) {
    parts.push(`Severity: ${hediff.severity_label}`);
  }

  if (hediff.bleeding && hediff.bleed_rate > 0) {
    parts.push(`Bleeding: ${(hediff.bleed_rate * 100).toFixed(1)}%/day`);
  }

  if (hediff.tendable_now && !hediff.is_tended) {
    parts.push('Needs treatment');
  } else if (hediff.is_tended) {
    parts.push('Treated');
  }

  if (hediff.is_permanent) {
    parts.push('Permanent');
  }

  if (hediff.age_string) {
    parts.push(`Age: ${hediff.age_string}`);
  }

  return parts.join(' • ') || 'Medical condition detected';
};

export default MedicalAlertsCard;