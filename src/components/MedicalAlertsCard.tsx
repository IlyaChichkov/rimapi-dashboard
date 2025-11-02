// src/components/MedicalAlertsCard.tsx
import React from 'react';
import { ColonistDetailed, MedicalAlert } from '../types';
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
}

const MedicalAlertsCard: React.FC<MedicalAlertsCardProps> = ({
  colonistsDetailed = [],
  loading = false
}) => {
  // Set default sorting by severity (critical first)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'severity', desc: false }
  ]);

  // State for filters
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  // Get unique colonist names for the filter dropdown
  const colonistNames = React.useMemo(() => {
    const names = colonistsDetailed.map(col => col.colonist.name);
    return Array.from(new Set(names)).sort();
  }, [colonistsDetailed]);

  // Analyze medical conditions and generate alerts using new API structure
  const medicalAlerts = React.useMemo(() => {
    const alerts: MedicalAlert[] = [];

    colonistsDetailed.forEach(colonist => {
      const { colonist: col, colonist_medical_info: medical } = colonist;

      // Calculate pain percentage from hediffs
      const totalPainPercent = medical.hediffs.reduce((total, hediff) => {
        return total + (hediff.pain_factor * hediff.pain_offset);
      }, 0);

      // Check for bleeding conditions
      const bleedingHediffs = medical.hediffs.filter(h => h.bleeding && h.bleed_rate > 0);
      const totalBleedRate = bleedingHediffs.reduce((total, h) => total + h.bleed_rate, 0);
      const BloodLoss = medical.hediffs?.find(h => h.def_name == "BloodLoss");
      const BloodLossSeverity = BloodLoss?.severity ?? 0;
      let DeathDueBloodLossTime: number = 0;
      if (BloodLossSeverity && BloodLossSeverity > 0.01 && totalBleedRate && totalBleedRate > 0.01) {
        DeathDueBloodLossTime = ((1 - BloodLossSeverity) / totalBleedRate);
      }

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
        });
      }

      // Check specific medical conditions using new hediff properties
      medical.hediffs.forEach(hediff => {
        const severity = getHediffSeverity(hediff);
        if (severity) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: hediff.label_cap || hediff.label,
            severity,
            bodyPart: hediff.part_label || 'Unknown',
            description: getHediffDescription(hediff),
            healthPercent: medical.health,
            bleedRate: hediff.bleed_rate,
          });
        }
      });

      // Check for high pain levels
      if (totalPainPercent > 0.8) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Severe Pain',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `High pain level (${Math.round(totalPainPercent * 100)}%) - Pain management needed`,
          healthPercent: medical.health
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
        });
      }

      if (bleedingHediffs.length > 0) {
        if (totalBleedRate > 0.5) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Severe Bleeding',
            severity: 'critical',
            bodyPart: 'Multiple',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Immediate treatment required`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
          });
        } else if (totalBleedRate > 0.01) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Bleeding',
            severity: 'serious',
            bodyPart: 'Overall',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Treatment needed`,
            healthPercent: medical.health,
            bleedRate: totalBleedRate,
          });
        }
      }

      // Check for untended wounds that need treatment
      const untendedWounds = medical.hediffs.filter(h =>
        h.tendable_now && !h.is_tended && h.def_name !== 'Scratch'
      );

      // Check hunger
      if (col.hunger < 0.2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Starvation',
          severity: 'serious',
          bodyPart: 'Overall',
          description: 'Severely malnourished - Immediate food required',
          healthPercent: medical.health
        });
      }
    });

    return alerts;
  }, [colonistsDetailed]);

  // Define columns for the table
  const columns = React.useMemo<ColumnDef<MedicalAlert>[]>(
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
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue.length === 0) return true;
          const severity = row.getValue(columnId) as string;
          return filterValue.includes(severity);
        },
      },
      {
        accessorKey: 'colonistName',
        header: 'Colonist',
        cell: ({ getValue }) => (
          <span className="colonist-name">{getValue() as string}</span>
        ),
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue.length === 0) return true;
          const colonistName = row.getValue(columnId) as string;
          return filterValue.includes(colonistName);
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
        cell: ({ getValue }) => (
          <span className="body-part">{getValue() as string}</span>
        ),
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
    data: medicalAlerts,
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

  // Get current filter values
  const severityFilterValue = (table.getColumn('severity')?.getFilterValue() as string[]) || [];
  const colonistFilterValue = (table.getColumn('colonistName')?.getFilterValue() as string[]) || [];

  // Counts for filtered data
  const filteredAlerts = table.getFilteredRowModel().rows;
  const criticalCount = filteredAlerts.filter(row => row.original.severity === 'critical').length;
  const seriousCount = filteredAlerts.filter(row => row.original.severity === 'serious').length;
  const warningCount = filteredAlerts.filter(row => row.original.severity === 'warning').length;

  const handleSeverityFilter = (severity: string) => {
    const column = table.getColumn('severity');
    const currentFilter = (column?.getFilterValue() as string[]) || [];

    const newFilter = currentFilter.includes(severity)
      ? currentFilter.filter(s => s !== severity)
      : [...currentFilter, severity];

    column?.setFilterValue(newFilter.length > 0 ? newFilter : undefined);
  };

  const handleColonistFilter = (colonistName: string) => {
    const column = table.getColumn('colonistName');
    const currentFilter = (column?.getFilterValue() as string[]) || [];

    const newFilter = currentFilter.includes(colonistName)
      ? currentFilter.filter(name => name !== colonistName)
      : [...currentFilter, colonistName];

    column?.setFilterValue(newFilter.length > 0 ? newFilter : undefined);
  };

  const clearAllFilters = () => {
    table.setColumnFilters([]);
    setGlobalFilter('');
  };

  const hasActiveFilters = columnFilters.some(filter =>
    Array.isArray(filter.value) ? filter.value.length > 0 : !!filter.value
  ) || globalFilter;

  return (
    <div className="medical-alerts-card">
      <div className="medical-header">
        <h3>🩺 Medical Alerts</h3>
        <div className="alert-stats">
          {criticalCount > 0 && <span className="stat critical">🚨 {criticalCount}</span>}
          {seriousCount > 0 && <span className="stat serious">⚠️ {seriousCount}</span>}
          {warningCount > 0 && <span className="stat warning">📋 {warningCount}</span>}
          <span className="total-alerts">Showing: {filteredAlerts.length}</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label>Severity:</label>
          <div className="filter-buttons">
            {['critical', 'serious', 'warning'].map(severity => (
              <button
                key={severity}
                className={`filter-btn severity ${severity} ${severityFilterValue.includes(severity) ? 'active' : ''}`}
                onClick={() => handleSeverityFilter(severity)}
              >
                {getSeverityIcon(severity)} {severity.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Colonist:</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleColonistFilter(e.target.value);
                e.target.value = ''; // Reset select
              }
            }}
            className="colonist-select"
          >
            <option value="">Add colonist filter...</option>
            {colonistNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="active-filters">
            {colonistFilterValue.map(name => (
              <span key={name} className="active-filter-tag">
                {name}
                <button onClick={() => handleColonistFilter(name)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search conditions, body parts..."
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
            <table className="medical-table">
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
const getHediffSeverity = (hediff: any): MedicalAlert['severity'] | null => {
  // Critical conditions - bleeding, high severity wounds, permanent injuries
  if (hediff.bleeding && hediff.bleed_rate > 0.5) {
    return 'critical';
  }

  if (hediff.severity > 10) {
    return 'critical';
  }

  // Serious conditions - moderate severity wounds, infections
  if (hediff.severity > 5) {
    return 'serious';
  }

  // Warning conditions - minor wounds, bruises, pain
  if (hediff.severity > 2 ||
    hediff.tendable_now && !hediff.is_tended) {
    return 'warning';
  }

  return null;
};

const getHediffDescription = (hediff: any): string => {
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