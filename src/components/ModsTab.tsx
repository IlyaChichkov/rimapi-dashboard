// src/components/ModsTab.tsx
import React, { useState } from 'react';
import { ModInfo } from '../types';
import './ModsTab.css';
import ExportModsButton from './ExportModsButton';

interface ModsTabProps {
  modsInfo?: ModInfo[];
  loading?: boolean;
}

const ModsTab: React.FC<ModsTabProps> = ({ 
  modsInfo = [], 
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'load_order' | 'name'>('load_order');

  // Filter and sort mods
  const filteredAndSortedMods = React.useMemo(() => {
    let filtered = modsInfo.filter(mod =>
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.package_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort mods
    filtered.sort((a, b) => {
      if (sortBy === 'load_order') {
        return a.load_order - b.load_order;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [modsInfo, searchTerm, sortBy]);

  // Check if mod has RIMAPI extension
  const hasRimApiExtension = (packageId: string): boolean => {
    // List of known RIMAPI extension mods
    const rimApiExtensions = [
      'redeyedev.rimapi',
    ];
    
    return rimApiExtensions.includes(packageId);
  };

  const getRimApiExtensionUrl = (packageId: string): string => {
    // Map package IDs to their RIMAPI extension endpoints
    const extensionEndpoints: { [key: string]: string } = {
      'redeyedev.rimapi': 'https://steamcommunity.com/sharedfiles/filedetails/?id=3593423732',
    };
    
    return extensionEndpoints[packageId] || `/api/v1/${packageId.split('.').pop()}/info`;
  };

  const getModType = (mod: ModInfo): 'core' | 'dlc' | 'mod' | 'library' | 'rimapi' => {
    const rimApi = ['redeyedev.rimapi'];
    const coreMods = ['ludeon.rimworld', 'brrainz.harmony', 'unlimitedhugs.hugslib'];
    const dlcMods = ['ludeon.rimworld.royalty', 'ludeon.rimworld.ideology', 'ludeon.rimworld.biotech', 'ludeon.rimworld.anomaly'];
    const libraryMods = ['zetrith.prepatcher', 'bs.fishery', 'imranfish.xmlextensions'];

    if (rimApi.includes(mod.package_id)) return 'rimapi';
    if (coreMods.includes(mod.package_id)) return 'core';
    if (dlcMods.includes(mod.package_id)) return 'dlc';
    if (libraryMods.includes(mod.package_id)) return 'library';
    return 'mod';
  };

  const getModTypeIcon = (type: string): string => {
    switch (type) {
      case 'core': return '⚙️';
      case 'dlc': return '🎮';
      case 'library': return '📚';
      default: return '🔧';
    }
  };

  return (
    <div className="mods-tab">
      <div className="mods-header">
        <h2>📦 Installed Mods ({modsInfo.length})</h2>
        <div className="mods-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search mods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mods-search"
            />
          </div>
          <div className="sort-container">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'load_order' | 'name')}
              className="mods-sort"
            >
              <option value="load_order">Sort by Load Order</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
          {/* Add Export Button */}
          <ExportModsButton modsInfo={modsInfo} />
        </div>
      </div>

      <div className="mods-content">
        {filteredAndSortedMods.length === 0 ? (
          <div className="no-mods">
            <div className="no-mods-icon">📦</div>
            <p>No mods found</p>
            <span className="no-mods-subtitle">
              {searchTerm ? 'Try a different search term' : 'No mods installed or detected'}
            </span>
          </div>
        ) : (
          <div className="mods-grid">
            {filteredAndSortedMods.map((mod) => {
              const modType = getModType(mod);
              const isRimApiExtension = hasRimApiExtension(mod.package_id);
              
              return (
                <div key={mod.package_id} className={`mod-card ${modType}`}>
                  <div className="mod-header">
                    <div className="mod-type-icon">
                      {getModTypeIcon(modType)}
                    </div>
                    <div className="mod-info">
                      <h3 className="mod-name">{mod.name}</h3>
                      <span className="mod-package">{mod.package_id}</span>
                    </div>
                    <div className="mod-load-order">
                      #{mod.load_order}
                    </div>
                  </div>
                  
                  <div className="mod-details">
                    <div className="mod-type-badge">
                      {modType.toUpperCase()}
                    </div>
                    
                    {isRimApiExtension && (
                      <a
                        href={getRimApiExtensionUrl(mod.package_id)}
                        className="rimapi-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`View ${mod.name} RIMAPI extension`}
                      >
                        <span className="link-icon">🔌</span>
                        <span className="link-text">RIMAPI Extension</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mods Summary */}
      <div className="mods-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-value">{modsInfo.length}</span>
            <span className="summary-label">Total Mods</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">
              {modsInfo.filter(mod => getModType(mod) === 'dlc').length}
            </span>
            <span className="summary-label">DLCs</span>
          </div>
          <div className="summary-item">
            <span className="summary-value">
              {modsInfo.filter(mod => hasRimApiExtension(mod.package_id)).length}
            </span>
            <span className="summary-label">RIMAPI Extensions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModsTab;