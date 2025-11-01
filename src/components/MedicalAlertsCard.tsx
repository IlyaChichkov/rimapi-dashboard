// src/components/MedicalAlertsCard.tsx
import React from 'react';
import { ColonistDetailed, MedicalAlert } from '../types';
import { selectAndViewColonist } from '../services/rimworldApi';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
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
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'severity', desc: false } // asc: critical -> serious -> warning -> info
  ]);

  // Analyze medical conditions and generate alerts using new API structure
  const medicalAlerts = React.useMemo(() => {
    const alerts: MedicalAlert[] = [];

    colonistsDetailed.forEach(colonist => {
      const { colonist: col, colonist_medical_info: medical } = colonist;

      // Calculate pain percentage from hediffs
      const totalPainPercent = medical.hediffs.reduce((total, hediff) => {
        return total + (hediff.pain_factor || 0);
      }, 0);

      // Check overall health
      if (medical.health < 0.3) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Critical Health',
          severity: 'critical',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(medical.health * 100)}% - Immediate medical attention required`,
          healthPercent: medical.health
        });
      } else if (medical.health < 0.6) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Poor Health',
          severity: 'serious',
          bodyPart: 'Overall',
          description: `Health at ${Math.round(medical.health * 100)}% - Medical attention recommended`,
          healthPercent: medical.health
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
            healthPercent: medical.health
          });
        }
      });

      // Check for high pain levels
      if (totalPainPercent > 0.5) {
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
          healthPercent: medical.health
        });
      }

      // Check for bleeding conditions
      const bleedingHediffs = medical.hediffs.filter(h => h.bleeding && h.bleed_rate > 0);
      if (bleedingHediffs.length > 0) {
        const totalBleedRate = bleedingHediffs.reduce((total, h) => total + h.bleed_rate, 0);
        if (totalBleedRate > 0.01) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Severe Bleeding',
            severity: 'critical',
            bodyPart: 'Multiple',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Immediate treatment required`,
            healthPercent: medical.health
          });
        } else if (totalBleedRate > 0.001) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: 'Bleeding',
            severity: 'serious',
            bodyPart: 'Multiple',
            description: `Bleeding at ${(totalBleedRate * 100).toFixed(1)}%/day - Treatment needed`,
            healthPercent: medical.health
          });
        }
      }

      // Check for untended wounds that need treatment
      const untendedWounds = medical.hediffs.filter(h =>
        h.tendable_now && !h.is_tended && h.def_name !== 'Scratch' // Exclude minor scratches
      );
      if (untendedWounds.length > 2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Multiple Untended Wounds',
          severity: 'serious',
          bodyPart: 'Multiple',
          description: `${untendedWounds.length} wounds require treatment`,
          healthPercent: medical.health
        });
      }

      // Check mood (mental health)
      if (col.mood < 0.3) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Extreme Mental Break Risk',
          severity: 'critical',
          bodyPart: 'Mental',
          description: `Mood at ${Math.round(col.mood * 100)}% - High risk of mental break`,
          healthPercent: medical.health
        });
      } else if (col.mood < 0.5) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Low Mood',
          severity: 'warning',
          bodyPart: 'Mental',
          description: `Mood at ${Math.round(col.mood * 100)}% - Monitor for mental breaks`,
          healthPercent: medical.health
        });
      }

      // Check hunger
      if (col.hunger < 0.2) {
        alerts.push({
          colonistId: col.id,
          colonistName: col.name,
          condition: 'Starvation',
          severity: 'critical',
          bodyPart: 'Overall',
          description: 'Severely malnourished - Immediate food required',
          healthPercent: medical.health
        });
      }
    });

    return alerts;
  }, [colonistsDetailed]);

  // Define columns for the table (same as before)
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
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Enable initial automatic sorting
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

  const criticalCount = medicalAlerts.filter(a => a.severity === 'critical').length;
  const seriousCount = medicalAlerts.filter(a => a.severity === 'serious').length;
  const warningCount = medicalAlerts.filter(a => a.severity === 'warning').length;

  return (
    <div className="medical-alerts-card">
      <div className="medical-header">
        <h3>🩺 Medical Alerts</h3>
        <div className="alert-stats">
          {criticalCount > 0 && <span className="stat critical">🚨 {criticalCount}</span>}
          {seriousCount > 0 && <span className="stat serious">⚠️ {seriousCount}</span>}
          {warningCount > 0 && <span className="stat warning">📋 {warningCount}</span>}
          <span className="total-alerts">Total: {medicalAlerts.length}</span>
        </div>
      </div>

      <div className="medical-content">
        {medicalAlerts.length === 0 ? (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <p>All colonists are healthy</p>
            <span className="no-alerts-subtitle">No medical issues detected</span>
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

// Updated helper functions to use new hediff structure
const getHediffSeverity = (hediff: any): MedicalAlert['severity'] | null => {
  const lowerLabel = hediff.label.toLowerCase();
  const defName = hediff.def_name?.toLowerCase();

  // Critical conditions - bleeding, high severity wounds, permanent injuries
  if (hediff.bleeding && hediff.bleed_rate > 0.01) {
    return 'critical';
  }

  if (hediff.severity > 10 || hediff.is_permanent) {
    return 'critical';
  }

  if (defName?.includes('gunshot') || defName?.includes('burn') ||
    lowerLabel.includes('размозжённая') || lowerLabel.includes('crush') ||
    lowerLabel.includes('открытый') || lowerLabel.includes('open')) {
    return 'critical';
  }

  // Serious conditions - moderate severity wounds, infections
  if (hediff.severity > 5 ||
    lowerLabel.includes('болезнь') || lowerLabel.includes('disease') ||
    lowerLabel.includes('инфекция') || lowerLabel.includes('infection') ||
    lowerLabel.includes('перелом') || lowerLabel.includes('fracture') ||
    lowerLabel.includes('шрам') && lowerLabel.includes('сильно болит')) {
    return 'serious';
  }

  // Warning conditions - minor wounds, bruises, pain
  if (hediff.severity > 2 ||
    lowerLabel.includes('ушиб') || lowerLabel.includes('bruise') ||
    lowerLabel.includes('царапина') || lowerLabel.includes('scratch') ||
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