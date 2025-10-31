// src/components/MedicalAlertsCard.tsx
import React from 'react';
import { ColonistDetailed, MedicalAlert } from '../types';
import './MedicalAlertsCard.css';

interface MedicalAlertsCardProps {
  colonistsDetailed?: ColonistDetailed[];
  loading?: boolean;
}

const MedicalAlertsCard: React.FC<MedicalAlertsCardProps> = ({ 
  colonistsDetailed = [], 
  loading = false 
}) => {
  // Analyze medical conditions and generate alerts
  const medicalAlerts = React.useMemo(() => {
    const alerts: MedicalAlert[] = [];

    colonistsDetailed.forEach(colonist => {
      const { colonist: col, colonist_medical_info: medical } = colonist;
      
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

      // Check specific medical conditions
      medical.hediffs.forEach(hediff => {
        const severity = getHediffSeverity(hediff.label);
        if (severity) {
          alerts.push({
            colonistId: col.id,
            colonistName: col.name,
            condition: hediff.label,
            severity,
            bodyPart: hediff.part || 'Unknown',
            description: getHediffDescription(hediff.label, hediff.part),
            healthPercent: medical.health
          });
        }
      });

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

    // Sort by severity: critical -> serious -> warning -> info
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, serious: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [colonistsDetailed]);

  const criticalAlerts = medicalAlerts.filter(alert => alert.severity === 'critical');
  const seriousAlerts = medicalAlerts.filter(alert => alert.severity === 'serious');
  const warningAlerts = medicalAlerts.filter(alert => alert.severity === 'warning');

  return (
    <div className="medical-alerts-card">
      <div className="medical-header">
        <h3>🩺 Medical Alerts</h3>
        <div className={`alert-count ${medicalAlerts.length > 0 ? 'has-alerts' : 'no-alerts'}`}>
          {medicalAlerts.length} Issues
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
          <div className="alerts-container">
            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && (
              <div className="alert-section critical-section">
                <h4 className="section-title critical-title">
                  🚨 Critical Conditions ({criticalAlerts.length})
                </h4>
                <div className="alerts-list">
                  {criticalAlerts.map((alert, index) => (
                    <MedicalAlertItem key={index} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Serious Alerts */}
            {seriousAlerts.length > 0 && (
              <div className="alert-section serious-section">
                <h4 className="section-title serious-title">
                  ⚠️ Serious Conditions ({seriousAlerts.length})
                </h4>
                <div className="alerts-list">
                  {seriousAlerts.map((alert, index) => (
                    <MedicalAlertItem key={index} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {warningAlerts.length > 0 && (
              <div className="alert-section warning-section">
                <h4 className="section-title warning-title">
                  📋 Monitoring ({warningAlerts.length})
                </h4>
                <div className="alerts-list">
                  {warningAlerts.map((alert, index) => (
                    <MedicalAlertItem key={index} alert={alert} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MedicalAlertItem: React.FC<{ alert: MedicalAlert }> = ({ alert }) => {
  const handleViewColonist = () => {
    // Placeholder for future API integration
    console.log(`Viewing colonist ${alert.colonistName} with condition: ${alert.condition}`);
    // TODO: Implement camera navigation to colonist in API
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

  return (
    <div className={`alert-item ${alert.severity}`}>
      <div className="alert-grid">
        {/* Left Column - Alert Info */}
        <div className="alert-info">
          <div className="alert-header">
            <span className="severity-icon">{getSeverityIcon(alert.severity)}</span>
            <span className="colonist-name">{alert.colonistName}</span>
            <span className="health-percent">{Math.round(alert.healthPercent * 100)}%</span>
          </div>
          
          <div className="alert-condition">{alert.condition}</div>
          
          <div className="alert-details">
            <span className="body-part">{alert.bodyPart}</span>
            <span className="alert-description">{alert.description}</span>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="alert-actions">
          <button 
            className="action-btn view-btn"
            onClick={handleViewColonist}
            title={`View ${alert.colonistName}'s details`}
          >
            <span className="action-icon">👁️</span>
            <span className="action-text">View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions to analyze medical conditions
const getHediffSeverity = (label: string): MedicalAlert['severity'] | null => {
  const lowerLabel = label.toLowerCase();
  
  // Critical conditions
  if (lowerLabel.includes('критический') || lowerLabel.includes('critical') || 
      lowerLabel.includes('инфаркт') || lowerLabel.includes('heart attack') ||
      lowerLabel.includes('открытый перелом') || lowerLabel.includes('open fracture') ||
      lowerLabel.includes('острая') || lowerLabel.includes('acute')) {
    return 'critical';
  }
  
  // Serious conditions
  if (lowerLabel.includes('болезнь') || lowerLabel.includes('disease') ||
      lowerLabel.includes('инфекция') || lowerLabel.includes('infection') ||
      lowerLabel.includes('перелом') || lowerLabel.includes('fracture')) {
    return 'serious';
  }
  
  // Warning conditions
  if (lowerLabel.includes('мигрень') || lowerLabel.includes('migraine') ||
      lowerLabel.includes('косоглазие') || lowerLabel.includes('lazy eye') ||
      lowerLabel.includes('слабовыраженная') || lowerLabel.includes('mild')) {
    return 'warning';
  }
  
  return null;
};

const getHediffDescription = (label: string, bodyPart: string | null): string => {
  if (bodyPart) {
    return `Affects ${bodyPart} - Monitor condition`;
  }
  return 'Systemic condition - Requires attention';
};

export default MedicalAlertsCard;