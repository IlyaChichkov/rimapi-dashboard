import React, { useState } from 'react';
import './ColonySummary.css';
import ColonySummarySettingsModal from '@/features/dashboard/modals/ColonySummarySettingsModal';
import { RimWorldData } from '@/types';

export interface ColonySummarySettings {
  showColonists: boolean;
  showAnimals: boolean;
  showItems: boolean;
  showWealth: boolean;
}

interface ColonySummaryProps {
  settings: ColonySummarySettings;
  onSettingsChange: (settings: ColonySummarySettings) => void;
  onOpenSettings: () => void;
  data: RimWorldData | null;
}

const ColonySummary: React.FC<ColonySummaryProps> = ({ settings, onSettingsChange, onOpenSettings, data }) => {
  const colonists = data?.colonists || [];
  const creatures = data?.creatures || {};
  const resources = data?.resources || { categories: [] };

  return (
    <div className="colony-summary-card">
      <div className="card-header">
        <h3>Colony Summary</h3>
        <button className="settings-btn layout-drag-ignore" onClick={onOpenSettings}>⚙️</button>
      </div>
      <div className="summary-stats-grid">
        {settings.showColonists && (
          <div className="summary-stat-item">
            <div className="summary-stat-value">{colonists.length}</div>
            <div className="summary-stat-label">Colonists</div>
          </div>
        )}
        {settings.showAnimals && (
          <div className="summary-stat-item">
            <div className="summary-stat-value">{creatures.animals_count || 0}</div>
            <div className="summary-stat-label">Animals</div>
          </div>
        )}
        {settings.showItems && (
          <div className="summary-stat-item">
            <div className="summary-stat-value">{resources.total_items || 0}</div>
            <div className="summary-stat-label">Total Items</div>
          </div>
        )}
        {settings.showWealth && (
          <div className="summary-stat-item">
            <div className="summary-stat-value">${Math.round(resources.total_market_value || 0)}</div>
            <div className="summary-stat-label">Wealth</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColonySummary;
