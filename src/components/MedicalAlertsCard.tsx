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
  /** include = keep rows that match; exclude = remove rows that match */
  mode: 'include' | 'exclude';
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
  const [filterChips, setFilterChips] = React.useState<FilterChip[]>([
    {
      id: 'tag-treated-default',
      type: 'tag',
      value: 'treated',
      label: 'treated',
      mode: 'exclude',
    },
  ]);
  const [searchInput, setSearchInput] = React.useState('');

  React.useEffect(() => {
    if (initialColonistFilter.length > 0) {
      const colonistChips: FilterChip[] = initialColonistFilter.map(colonistName => ({
        id: `colonist-${colonistName}-initial`,
        type: 'colonist',
        value: colonistName,
        label: colonistName,
        mode: 'include',
      }));
      setFilterChips(prev => [
        ...prev.filter(chip => !(chip.type === 'colonist' && chip.mode === 'include')),
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

    if (hediff?.bleeding && (hediff.bleed_rate ?? 0) > 0) {
      tags.push('bleeding');
    }

    const label = (hediff?.label || '').toLowerCase();
    const def = hediff?.def_name || '';

    if (def.includes('Infection') || label.includes('infection')) tags.push('infection');
    if (def.includes('Fracture') || label.includes('fracture')) tags.push('fracture');
    if (def.includes('Burn') || label.includes('burn')) tags.push('burn');
    if (hediff?.is_permanent) tags.push('chronic');
    if (hediff?.is_currently_life_threatening) tags.push('emergency');
    if (hediff?.is_tended) tags.push('treated');

    return tags;
  };

  // Analyze medical conditions and generate alerts using new API structure
  const medicalAlerts = React.useMemo(() => {
    const alerts: (MedicalAlert & { tags: string[] })[] = [];

    colonistsDetailed.forEach(colonist => {
      const { colonist: col, colonist_medical_info: medical } = colonist;
      if (!medical) return;

      // Calculate pain percentage from hediffs (guard against NaN)
      const totalPainPercent = (medical.hediffs || []).reduce((total, h) => {
        const pf = Number(h?.pain_factor ?? 0);
        const po = Number(h?.pain_offset ?? 0);
        const add = isFinite(pf * po) ? pf * po : 0;
        return total + add;
      }, 0);

      // Check for bleeding conditions
      const bleedingHediffs = (medical.hediffs || []).filter(h => h?.bleeding && (h.bleed_rate ?? 0) > 0);
      const totalBleedRate = bleedingHediffs.reduce((total, h) => total + (h.bleed_rate ?? 0), 0);

      // Per-hediff alerts
      (medical.hediffs || []).forEach(hediff => {
        if (!hediff) return;
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
            healthPercent: medical.health ?? 0,
            bleedRate: hediff.bleed_rate,
            tags
          });
        }
      });

      // Overall health
      const health = medical.health ?? 0;
      if (health < 0.25) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Critical Health',
          severity: 'critical',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(health * 100)}% - Immediate medical attention required`,
          healthPercent: health,
          tags: ['critical-health', 'overall']
        });
      } else if (health < 0.6) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Poor Health',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(health * 100)}% - Medical attention recommended`,
          healthPercent: health,
          tags: ['overall']
        });
      }

      // Pain levels
      if (totalPainPercent > 0.8) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Severe Pain',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `High pain level (${Math.round(totalPainPercent * 100)}%) - Pain management needed`,
          healthPercent: health,
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
          healthPercent: health,
          tags: ['pain', 'overall']
        });
      }

      // Bleeding totals
      if (bleedingHediffs.length > 0) {
        if (totalBleedRate > 0.5) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Severe Bleeding',
            severity: 'serious',
            bodyPart: 'Overall',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Immediate treatment required`,
            healthPercent: health,
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
            healthPercent: health,
            bleedRate: totalBleedRate,
            tags: ['overall']
          });
        }
      }

      // Blood loss prognosis
      const bloodLoss = (medical.hediffs || []).find(h => h?.def_name === 'BloodLoss');
      const bloodLossSeverity = bloodLoss?.severity ?? 0;
      let deathDueBloodLossTime = 0;

      if (bloodLossSeverity > 0.01 && totalBleedRate > 0.01) {
        deathDueBloodLossTime = ((1 - bloodLossSeverity) / totalBleedRate * 24 * 60); // minutes

        if (deathDueBloodLossTime < 300) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'IMMINENT DEATH - Blood Loss',
            severity: 'critical',
            bodyPart: 'Circulatory',
            description: `Will die in ${Math.round(deathDueBloodLossTime)} minutes - EMERGENCY`,
            healthPercent: health,
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
            healthPercent: health,
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
            healthPercent: health,
            bleedRate: totalBleedRate,
            tags: ['overall', 'bloodLoss']
          });
        }
      }

      // Hunger
      if ((col.hunger ?? 1) < 0.2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Starvation',
          severity: 'serious',
          bodyPart: 'Overall',
          description: 'Severely malnourished - Immediate food required',
          healthPercent: health,
          tags: ['starvation', 'overall']
        });
      }
    });

    return alerts;
  }, [colonistsDetailed]);

  // --- Filtering with include/exclude chips ---
  const matchesChip = React.useCallback((alert: MedicalAlert & { tags: string[] }, chip: FilterChip) => {
    const val = chip.value.toLowerCase();

    switch (chip.type) {
      case 'colonist':
        return alert.colonistName.toLowerCase().includes(val);
      case 'hediff':
        return alert.condition.toLowerCase().includes(val);
      case 'tag':
        return alert.tags.some(t => t.toLowerCase() === val);
      case 'bodypart':
        return alert.bodyPart.toLowerCase().includes(val);
      case 'severity':
        return alert.severity.toLowerCase() === val;
      case 'search':
        // Broad search across fields
        return [
          alert.colonistName,
          alert.condition,
          alert.bodyPart,
          alert.severity,
          ...(alert.tags || []),
          alert.description ?? '',
          String(alert.bleedRate ?? ''),
          String(Math.round((alert.healthPercent ?? 0) * 100)),
        ]
          .join(' ')
          .toLowerCase()
          .includes(val);
      default:
        return true;
    }
  }, []);

  const filteredAlerts = React.useMemo(() => {
    if (filterChips.length === 0) return medicalAlerts;

    const includeChips = filterChips.filter(c => c.mode === 'include');
    const excludeChips = filterChips.filter(c => c.mode === 'exclude');

    return medicalAlerts.filter(alert => {
      // Exclude: if any exclude chip matches, drop the row
      if (excludeChips.some(chip => matchesChip(alert, chip))) return false;

      // Include: alert must match ALL include chips (AND logic)
      if (includeChips.length > 0 && !includeChips.every(chip => matchesChip(alert, chip))) {
        return false;
      }

      return true;
    });
  }, [medicalAlerts, filterChips, matchesChip]);

  // Define columns for the table
  const columns = React.useMemo<ColumnDef<MedicalAlert & { tags: string[] }>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => {
          const severity = (getValue() as string) || 'info';
          const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
            handleCellFilterClick(e, 'severity', severity, severity.toUpperCase());
          };
          const onContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
            e.preventDefault();
            addFilterChip('severity', severity, severity.toUpperCase(), 'exclude');
          };

          return (
            <div
              className={`severity-badge ${severity}`}
              title="Left click to include • Right click / Alt+Click to exclude"
              onClick={onClick}
              onContextMenu={onContextMenu}
              role="button"
              tabIndex={0}
            >
              {getSeverityIcon(severity)}
              <span className="severity-text">{severity.toUpperCase()}</span>
            </div>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const severityOrder = { critical: 0, serious: 1, warning: 2, info: 3 } as const;
          const a = (rowA.getValue(columnId) as keyof typeof severityOrder) ?? 'info';
          const b = (rowB.getValue(columnId) as keyof typeof severityOrder) ?? 'info';
          return severityOrder[a] - severityOrder[b];
        },
      },
      {
        accessorKey: 'colonistName',
        header: 'Colonist',
        cell: ({ getValue }) => {
          const name = (getValue() as string) || '';
          const onClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
            handleCellFilterClick(e, 'colonist', name, name);
          };
          const onContextMenu: React.MouseEventHandler<HTMLSpanElement> = (e) => {
            e.preventDefault();
            addFilterChip('colonist', name, name, 'exclude');
          };

          return (
            <span
              className="colonist-name"
              title="Left click to include • Right click / Alt+Click to exclude"
              onClick={onClick}
              onContextMenu={onContextMenu}
              role="button"
              tabIndex={0}
            >
              {name}
            </span>
          );
        },
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
        cell: ({ getValue }) => {
          const part = (getValue() as string) || '';
          const onClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
            handleCellFilterClick(e, 'bodypart', part, part);
          };
          const onContextMenu: React.MouseEventHandler<HTMLSpanElement> = (e) => {
            e.preventDefault();
            addFilterChip('bodypart', part, part, 'exclude');
          };

          return (
            <span
              className="body-part"
              title="Left click to include • Right click / Alt+Click to exclude"
              onClick={onClick}
              onContextMenu={onContextMenu}
              role="button"
              tabIndex={0}
            >
              {part}
            </span>
          );
        },
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ getValue }) => {
          const tags = (getValue() as string[]) || [];
          return (
            <div className="tags-container">
              {tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className={`tag tag-${tag}`}
                  title="Left click to include • Right click / Alt+Click to exclude"
                  onClick={(e) => handleCellFilterClick(e, 'tag', tag, tag)}
                  onContextMenu={(e) => { e.preventDefault(); addFilterChip('tag', tag, tag, 'exclude'); }}
                  role="button"
                  tabIndex={0}
                >
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
          return (a ?? 0) - (b ?? 0);
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
          const healthPercent = Number(getValue() as number) || 0;
          return (
            <div className="health-cell">
              <span className="health-percent">{Math.round(healthPercent * 100)}%</span>
              <div className="health-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(healthPercent * 100)}>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterChips] // (columns contain handlers that reference addFilterChip/handleCellFilterClick)
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

  // --- Filter chip management (include & exclude) ---
  const addFilterChip = React.useCallback(
    (type: FilterChip['type'], value: string, label?: string, mode: FilterChip['mode'] = 'include') => {
      const trimmed = (value || '').trim();
      if (!trimmed) return;

      const exists = filterChips.some(c =>
        c.type === type &&
        c.mode === mode &&
        c.value.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return; // ignore duplicates

      const chip: FilterChip = {
        id: `${type}-${mode}-${trimmed}-${Date.now()}`,
        type,
        value: trimmed,
        label: label || trimmed,
        mode,
      };

      setFilterChips(prev => [...prev, chip]);
      setSearchInput('');
    },
    [filterChips]
  );

  const handleCellFilterClick = (
    e: React.MouseEvent,
    type: FilterChip['type'],
    value: string,
    label?: string
  ) => {
    const mode: FilterChip['mode'] = e.altKey ? 'exclude' : 'include';
    addFilterChip(type, value, label, mode);
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
      addFilterChip('search', searchInput.trim(), undefined, 'include');
    }
  };

  const handleQuickFilter = (type: FilterChip['type'], value: string, label: string) => {
    addFilterChip(type, value, label, 'include');
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

  // Multi-column sorting handler (kept as-is)
  const handleHeaderClick = (header: any, event: React.MouseEvent) => {
    if (!header.column.getCanSort()) return;

    if (event.shiftKey) {
      const currentSorts = [...sorting];
      const existingIndex = currentSorts.findIndex(s => s.id === header.column.id);

      if (existingIndex >= 0) {
        const currentSort = currentSorts[existingIndex];
        if (currentSort.desc) {
          currentSorts.splice(existingIndex, 1);
        } else {
          currentSorts[existingIndex] = { ...currentSort, desc: !currentSort.desc };
        }
      } else {
        currentSorts.push({ id: header.column.id, desc: false });
      }

      setSorting(currentSorts);
    } else {
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

      <div className="filter-controls-wrapper">
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
                  title="Left click to include"
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
              <button type="submit" className="add-chip-btn" title="Add as include filter">
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
                  <div
                    key={chip.id}
                    className={`filter-chip chip-${chip.type} ${chip.mode === 'exclude' ? 'chip-exclude' : ''}`}
                    title={chip.mode === 'exclude' ? 'Exclude filter' : 'Include filter'}
                  >
                    <span className="chip-type">
                      {chip.mode === 'exclude' ? 'EXCLUDE' : 'INCLUDE'} {chip.type}:
                    </span>
                    <span className="chip-value">{chip.label}</span>
                    <button
                      onClick={() => removeFilterChip(chip.id)}
                      className="chip-remove"
                      aria-label="Remove filter"
                      title="Remove filter"
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
        {/* === New Tip Section === */}
        <div className="filter-tip">
          <h4>ℹ️ Tips</h4>
          <ul>
            <li>Left-click a <strong>tag</strong>, <strong>colonist</strong>, or <strong>severity</strong> to include it as a filter.</li>
            <li>Right-click or <kbd>Alt + Click</kbd> to exclude that value.</li>
            <li>You can combine multiple filters and even negatives for precise results.</li>
            <li>Use the “Add Filter” box to search any keyword.</li>
          </ul>
        </div>
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
  const bleedRate = Number(hediff?.bleed_rate ?? 0);
  const severityVal = Number(hediff?.severity ?? 0);

  if (hediff?.bleeding && bleedRate > 0.5) return 'critical';
  if (severityVal > 10) return 'serious';
  if (severityVal > 5) return 'warning';
  if (hediff?.is_tended) return 'info';
  return 'warning';
};

const getHediffDescription = (hediff: Hediff): string => {
  const parts: string[] = [];

  if (hediff?.severity_label) parts.push(`Severity: ${hediff.severity_label}`);
  if (hediff?.bleeding && (hediff.bleed_rate ?? 0) > 0) {
    parts.push(`Bleeding: ${((hediff.bleed_rate ?? 0) * 100).toFixed(1)}%/day`);
  }
  if (hediff?.tendable_now && !hediff?.is_tended) parts.push('Needs treatment');
  else if (hediff?.is_tended) parts.push('Treated');
  if (hediff?.is_permanent) parts.push('Permanent');
  if (hediff?.age_string) parts.push(`Age: ${hediff.age_string}`);

  return parts.join(' • ') || 'Medical condition detected';
};

export default MedicalAlertsCard;
