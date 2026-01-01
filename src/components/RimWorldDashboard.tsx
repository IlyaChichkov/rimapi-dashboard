// src/components/RimWorldDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  ColonistStatsChart,
  ResourcesChart,
  PowerChart,
  PopulationChart,
} from './RimWorldCharts';
import LoadingScreen from './LoadingScreen';
import ConnectionErrorScreen from './ConnectionErrorScreen';
import { fetchRimWorldData, setApiBaseUrl } from '../services/rimworldApi';
import { Colonist, RimWorldData } from '../types';
import './RimWorldDashboard.css';
import ResearchCards from './ResearchCards';
import ColonistsTab from './ColonistsTab';
import Footer from './Footer';
import MedicalAlertsCard from './MedicalAlertsCard';
import ModsTab from './ModsTab';
import ResourcesDashboard from './ResourcesDashboard';
import { useToast } from './ToastContext';
import DevTab from './DevTab';

// Tab types
type DashboardTab = 'dashboard' | 'medical' | 'research' | 'colonists' | 'resources' | 'tools';

interface RimWorldDashboardProps {
  apiUrl: string;
  onResetConfig: () => void;
  onGameStateChange: () => void;
}

const RimWorldDashboard: React.FC<RimWorldDashboardProps> = ({
  apiUrl,
  onResetConfig,
  onGameStateChange
}) => {
  const [data, setData] = useState<RimWorldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const colonistsDetailed = data?.colonistsDetailed || [];

  const [sortBy, setSortBy] = useState<'name' | 'mood'>('name');
  const [medicalTabColonistFilter, setMedicalTabColonistFilter] = React.useState<string[]>([]);

  const { addToast } = useToast();

  const getSortedColonists = useCallback((colonists: Colonist[], sortBy: 'name' | 'mood') => {
    const sorted = [...colonists];
    switch (sortBy) {
      case 'mood':
        return sorted.sort((a, b) => (b.mood || 0) - (a.mood || 0));
      case 'name':
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    setApiBaseUrl(apiUrl);
  }, [apiUrl]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const rimWorldData = await fetchRimWorldData();
      if (!rimWorldData.gameState || (rimWorldData.gameState as any).program_state !== 'Playing' || !rimWorldData.colonists || rimWorldData.colonists.length === 0) {
        onGameStateChange();
        return;
      }
      setData(rimWorldData);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching RimWorld data:', error);
      setError('Failed to load data from RimWorld API');
    } finally {
      setLoading(false);
    }
  }, [onGameStateChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, loadData]);

  const handleManualRefresh = () => {
    loadData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const colonists = data?.colonists || [];
  const resources = data?.resources || { categories: [] };
  const creatures = data?.creatures || {};
  const power = data?.power || {};
  const gameState = data?.gameState || {};
  const map_datetime = data?.map_datetime || {};
  const weather = data?.weather || {};
  const researchProgress = data?.researchProgress;
  const researchFinished = data?.researchFinished || { finished_projects: [] };
  const researchSummary = data?.researchSummary || {
    finished_projects_count: 0,
    total_projects_count: 0,
    available_projects_count: 0,
    by_tech_level: {},
    by_tab: {}
  };
  const modsInfo = data?.modsInfo || [];

  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  const sortedColonists = getSortedColonists(colonists, sortBy);

  const initialLayout: Layout = [
    { i: 'colonists', x: 0, y: 0, w: 6, h: 2 },
    { i: 'resources', x: 6, y: 0, w: 6, h: 2 },
    { i: 'power', x: 0, y: 2, w: 4, h: 2 },
    { i: 'population', x: 4, y: 2, w: 4, h: 2 },
    { i: 'summary', x: 8, y: 2, w: 4, h: 2 }
  ];

  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [isAddCardMenuOpen, setAddCardMenuOpen] = useState(false);
  const trashRef = useRef<HTMLDivElement>(null);
  const { width, containerRef, mounted } = useContainerWidth();

  const [presets, setPresets] = useState<{ name: string, layout: Layout }[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [presetName, setPresetName] = useState<string>("");

  useEffect(() => {
    const savedPresets = localStorage.getItem('dashboard_presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  const handleSavePreset = () => {
    if (presetName) {
      const newPreset = { name: presetName, layout: layout };
      const updatedPresets = [...presets.filter(p => p.name !== presetName), newPreset];
      setPresets(updatedPresets);
      localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
      setSelectedPreset(presetName);
      addToast({
        type: 'success',
        title: `Preset '${presetName}' saved!`,
      });
      setPresetName(""); // Clear input after saving
    } else {
      addToast({
        type: 'warning',
        title: 'Please enter a name for the preset.',
      });
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);
    if (presetName) {
      const preset = presets.find(p => p.name === presetName);
      if (preset) {
        setLayout(preset.layout);
      }
    } else {
      setLayout(initialLayout);
    }
  };

  const handleDeletePreset = () => {
    if (selectedPreset) {
      const updatedPresets = presets.filter(p => p.name !== selectedPreset);
      setPresets(updatedPresets);
      localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
      setSelectedPreset(""); // Go back to default
      addToast({
        type: 'success',
        title: `Preset '${selectedPreset}' deleted!`,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Please select a preset to delete.',
      });
    }
  };

  const onLayoutChange = (newLayout: Layout) => {
    setLayout(newLayout);
    setSelectedPreset(""); // Deselect preset on layout change
  };

  const onRemoveItem = (itemId: string) => {
    setLayout(layout.filter(item => item.i !== itemId));
  };

  const onAddItem = (itemId: string) => {
    const newItem: Layout[number] = {
      i: `${itemId}_${new Date().getTime()}`,
      x: (layout.length * 4) % 12,
      y: Infinity,
      w: 4,
      h: 2,
    };
    setLayout([...layout, newItem]);
    setAddCardMenuOpen(false);
  };

  const onDragStop = (
    gridLayout: Layout,
    oldItem: Layout[number],
    newItem: Layout[number],
    placeholder: Layout[number],
    e: MouseEvent
  ) => {
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const isOverTrash = e.clientX > trashRect.left && e.clientX < trashRect.right &&
        e.clientY > trashRect.top && e.clientY < trashRect.bottom;
      if (isOverTrash) {
        onRemoveItem(newItem.i);
      }
      trashRef.current.classList.remove('over');
    }
  };

  const onDrag = (
    gridLayout: Layout,
    oldItem: Layout[number],
    newItem: Layout[number],
    placeholder: Layout[number],
    e: MouseEvent
  ) => {
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const isOverTrash = e.clientX > trashRect.left && e.clientX < trashRect.right &&
        e.clientY > trashRect.top && e.clientY < trashRect.bottom;
      if (isOverTrash) {
        trashRef.current.classList.add('over');
      } else {
        trashRef.current.classList.remove('over');
      }
    }
  };

  const availableCards = ['colonists', 'resources', 'power', 'population', 'summary'];

  if (loading && !data && !error) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ConnectionErrorScreen
      error={error}
      apiUrl={apiUrl}
      onRetry={loadData}
      onChangeUrl={onResetConfig}
    />;
  }

  const handleOpenMedicalTabWithColonist = (colonistName: string) => {
    setMedicalTabColonistFilter([colonistName]);
    setActiveTab('medical');
  };

  const renderCard = (item: Layout[number]) => {
    const cardId = item.i.split('_')[0];
    switch (cardId) {
      case 'colonists':
        return (
          <div key={item.i} className="chart-card">
            <div className="chart-header">
              <h3>Mood</h3>
              <div className="chart-corner-container">
                <div className="colonist-count-badge">{colonists.length} Colonists</div>
                <div className="sort-controls">
                  <span className="sort-label">Sort by:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'mood')} className="sort-select">
                    <option className="filter-option" value="name">Name</option>
                    <option className="filter-option" value="mood">Mood</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="chart-container">
              {colonists.length > 0 ? <ColonistStatsChart colonists={getSortedColonists(colonists, sortBy)} /> : <div className="no-data">No colonist data available</div>}
            </div>
          </div>
        );
      case 'resources':
        return (
          <div key={item.i} className="chart-card">
            <div className="chart-header">
              <h3>Resource Distribution</h3>
              <div className="resource-total">Total: {resources.total_items || 0} items</div>
            </div>
            <div className="chart-container">
              {resources.categories && resources.categories.length > 0 ? <ResourcesChart resources={resources} /> : <div className="no-data">No resource data available</div>}
            </div>
          </div>
        );
      case 'power':
        return (
          <div key={item.i} className="chart-card">
            <div className="chart-header">
              <div className="chart-header-top">
                <h3>Power Management</h3>
                <div className="power-header-controls">
                  <div className="power-status">
                    Net: {(power.current_power || 0) - (power.total_consumption || 0)}W
                    {(power.total_consumption || 0) > (power.current_power || 0) && (
                      <span className="power-warning-icon" title="Power consumption exceeds production!">⚠️</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="chart-container"><PowerChart power={power} /></div>
          </div>
        );
      case 'population':
        return (
          <div key={item.i} className="chart-card">
            <div className="chart-header"><h3>Population Overview</h3></div>
            <div className="chart-container"><PopulationChart creatures={creatures} /></div>
          </div>
        );
      case 'summary':
        return (
          <div key={item.i} className="stats-card">
            <h3>Colony Summary</h3>
            <div className="summary-stats-grid">
              <div className="summary-stat-item">
                <div className="summary-stat-value">{colonists.length}</div>
                <div className="summary-stat-label">Colonists</div>
              </div>
              <div className="summary-stat-item">
                <div className="summary-stat-value">{creatures.animals_count || 0}</div>
                <div className="summary-stat-label">Animals</div>
              </div>
              <div className="summary-stat-item">
                <div className="summary-stat-value">{resources.total_items || 0}</div>
                <div className="summary-stat-label">Total Items</div>
              </div>
              <div className="summary-stat-item">
                <div className="summary-stat-value">${Math.round(resources.total_market_value || 0)}</div>
                <div className="summary-stat-label">Wealth</div>
              </div>
            </div>
          </div>
        );
      default:
        return <div key={item.i} className="chart-card"><h3>{cardId}</h3><p>Card content not implemented.</p></div>;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div ref={containerRef as React.RefObject<HTMLDivElement>}>
            {mounted && (
              <ReactGridLayout
                layout={layout}
                onLayoutChange={onLayoutChange}
                onDrag={onDrag as any}
                onDragStop={onDragStop as any}
                width={width}
                // @ts-ignore
                gridConfig={{
                  cols: 12,
                  rowHeight: 150,
                }}
              >
                {layout.map(item => renderCard(item))}
              </ReactGridLayout>
            )}
          </div>
        );
      case 'medical':
        return <MedicalTab
          colonistsDetailed={colonistsDetailed}
          loading={loading}
          initialColonistFilter={medicalTabColonistFilter}
        />;
      case 'research':
        return <ResearchTab
          researchProgress={researchProgress}
          researchFinished={researchFinished}
          researchSummary={researchSummary}
          loading={loading}
        />;
      case 'colonists':
        return <ColonistsTab
          colonistsDetailed={colonistsDetailed}
          loading={loading}
          onViewHealth={handleOpenMedicalTabWithColonist}
        />;
      case 'resources':
        return <ResourcesTab loading={loading} />;
      case 'tools':
        return <DevTab modsInfo={modsInfo} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <div className="rimworld-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>RimWorld Colony Dashboard</h1>
          <div className="game-info">
            <span>Date: {map_datetime.datetime || 'Unknown'}</span>
            <span>Weather: {weather.weather || 'Unknown'}</span>
            <span>Temp: {Math.round(weather.temperature) || 0}°C</span>
            <span>Storyteller: {gameState.storyteller || 'Unknown'}</span>
            {lastUpdated && (
              <div className="last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <div className="header-controls">
          <button
            onClick={toggleAutoRefresh}
            className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={handleManualRefresh} className="refresh-btn">
            Refresh Now
          </button>
          <button onClick={onResetConfig} className="refresh-btn">
            Change API URL
          </button>
        </div>
      </header>

      <div className="tabs-navigation">
        <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
        <button className={`tab-button ${activeTab === 'medical' ? 'active' : ''}`} onClick={() => setActiveTab('medical')}>🩺 Medical</button>
        <button className={`tab-button ${activeTab === 'research' ? 'active' : ''}`} onClick={() => setActiveTab('research')}>🔬 Research</button>
        <button className={`tab-button ${activeTab === 'colonists' ? 'active' : ''}`} onClick={() => setActiveTab('colonists')}>👥 Colonists</button>
        <button className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>📦 Resources</button>
        <button className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>⚙️ Tools</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-actions-bar">
          <div className="add-card-container">
            <button className="add-card-btn" onClick={() => setAddCardMenuOpen(!isAddCardMenuOpen)}>
              ✨ Add Card
            </button>
            {isAddCardMenuOpen && (
              <div className="add-card-menu">
                {availableCards.map(cardId => (
                  <button key={cardId} onClick={() => onAddItem(cardId)}>
                    {cardId}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="dashboard-presets">
            <select className="presets-select" onChange={handlePresetChange} value={selectedPreset}>
              <option value="">Select Preset</option>
              {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <input
              type="text"
              className="preset-name-input"
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button className="save-preset-btn" onClick={handleSavePreset}>Save Preset</button>
            <button className="delete-preset-btn" onClick={handleDeletePreset}>Delete Preset</button>
          </div>
          <div className="trash-zone" ref={trashRef}>
            <span>🗑️ Drag here to delete</span>
          </div>
        </div>
      )}

      <div className="tab-content">
        {renderTabContent()}
      </div>

      {autoRefresh && (
        <div className="auto-refresh-indicator">
          <div className="refresh-pulse"></div>
          Auto-refreshing every 5 seconds...
        </div>
      )}

      <div className='footer-spacer'></div>
      <Footer />
    </div>
  );
};

interface MedicalTabProps {
  colonistsDetailed: any[];
  loading: boolean;
  initialColonistFilter?: string[];
}

const MedicalTab: React.FC<MedicalTabProps> = ({ colonistsDetailed, loading, initialColonistFilter }) => {
  return (
    <div className="medical-tab">
      <MedicalAlertsCard
        colonistsDetailed={colonistsDetailed}
        loading={loading}
        initialColonistFilter={initialColonistFilter}
      />
    </div>
  );
};

interface ResearchTabProps {
  researchProgress: any;
  researchFinished: any;
  researchSummary: any;
  loading: boolean;
}

const ResearchTab: React.FC<ResearchTabProps> = ({
  researchProgress,
  researchFinished,
  researchSummary,
  loading
}) => {
  return (
    <ResearchCards
      researchProgress={researchProgress}
      researchFinished={researchFinished}
      researchSummary={researchSummary}
      loading={loading}
    />
  );
};

interface ResourcesTabProps {
  loading: boolean;
}

const ResourcesTab: React.FC<ResourcesTabProps> = ({ loading }) => {
  return (
    <div className="resources-tab">
      <ResourcesDashboard />
    </div>
  );
};

export default RimWorldDashboard;