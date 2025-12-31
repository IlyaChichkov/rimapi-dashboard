// src/components/RimWorldDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
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

  // Add this function to sort colonists
  const getSortedColonists = useCallback((colonists: Colonist[], sortBy: 'name' | 'health' | 'mood') => {
    const sorted = [...colonists];
    switch (sortBy) {
      case 'health':
        return sorted.sort((a, b) => (b.health || 0) - (a.health || 0));
      case 'mood':
        return sorted.sort((a, b) => (b.mood || 0) - (a.mood || 0));
      case 'name':
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, []);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set API URL when component mounts or URL changes
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

      console.log(rimWorldData)
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

  // Safe data accessors
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
  

  // Update the sorted colonists
  const sortedColonists = getSortedColonists(colonists, sortBy);

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

  // And make sure medicalTabColonistFilter is being set correctly:
  const handleOpenMedicalTabWithColonist = (colonistName: string) => {
    console.log('Setting medical filter for:', colonistName); // Debug log
    setMedicalTabColonistFilter([colonistName]);
    setActiveTab('medical');
  };

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab
          colonists={colonists}
          resources={resources}
          power={power}
          creatures={creatures}
          researchProgress={researchProgress}
          researchFinished={researchFinished}
          researchSummary={researchSummary}
          loading={loading}
        />;

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
        return <DashboardTab
          colonists={colonists}
          resources={resources}
          power={power}
          creatures={creatures}
          researchProgress={researchProgress}
          researchFinished={researchFinished}
          researchSummary={researchSummary}
          loading={loading}
        />;
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

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          🩺 Medical
        </button>
        <button
          className={`tab-button ${activeTab === 'research' ? 'active' : ''}`}
          onClick={() => setActiveTab('research')}
        >
          🔬 Research
        </button>
        <button
          className={`tab-button ${activeTab === 'colonists' ? 'active' : ''}`}
          onClick={() => setActiveTab('colonists')}
        >
          👥 Colonists
        </button>
        <button
          className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          📦 Resources
        </button>
        <button
          className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          ⚙️ Tools
        </button>
      </div>

      {/* Tab Content */}
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

// Tab Components
interface DashboardTabProps {
  colonists: Colonist[];
  resources: any;
  power: any;
  creatures: any;
  researchProgress: any;
  researchFinished: any;
  researchSummary: any;
  loading: boolean;
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  colonists,
  resources,
  power,
  creatures,
  loading,
}) => {
  const { width, containerRef, mounted } = useContainerWidth();
  const [sortBy, setSortBy] = useState<'name' | 'mood'>('name');

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

  const sortedColonists = getSortedColonists(colonists, sortBy);

  const layout = [
    { i: 'colonists', x: 0, y: 0, w: 6, h: 2 },
    { i: 'resources', x: 6, y: 0, w: 6, h: 2 },
    { i: 'power', x: 0, y: 2, w: 4, h: 2 },
    { i: 'population', x: 4, y: 2, w: 4, h: 2 },
    { i: 'summary', x: 8, y: 2, w: 4, h: 2 }
  ];

  return (
    <div ref={containerRef}>
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{
            cols: 12,
            rowHeight: 150,
          }}
        >
          <div key="colonists" className="chart-card">
            <div className="chart-header">
              <h3>Mood</h3>
              <div className="chart-corner-container">
                <div className="colonist-count-badge">
                  {colonists.length} Colonists
                </div>
                <div className="sort-controls">
                  <span className="sort-label">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'mood')}
                    className="sort-select"
                  >
                    <option className="filter-option" value="name">Name</option>
                    <option className="filter-option" value="mood">Mood</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="chart-container">
              {colonists.length > 0 ? (
                <ColonistStatsChart colonists={sortedColonists} />
              ) : (
                <div className="no-data">No colonist data available</div>
              )}
            </div>
          </div>
          <div key="resources" className="chart-card">
            <div className="chart-header">
              <h3>Resource Distribution</h3>
              <div className="resource-total">
                Total: {resources.total_items || 0} items
              </div>
            </div>
            <div className="chart-container">
              {resources.categories && resources.categories.length > 0 ? (
                <ResourcesChart resources={resources} />
              ) : (
                <div className="no-data">No resource data available</div>
              )}
            </div>
          </div>
          <div key="power" className="chart-card">
            <div className="chart-header">
              <div className="chart-header-top">
                <h3>Power Management</h3>
                <div className="power-header-controls">
                  <div className="power-status">
                    Net: {(power.current_power || 0) - (power.total_consumption || 0)}W
                    {(power.total_consumption || 0) > (power.current_power || 0) && (
                      <span className="power-warning-icon" title="Power consumption exceeds production!">
                        ⚠️
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="chart-container">
              <PowerChart power={power} />
            </div>
          </div>
          <div key="population" className="chart-card">
            <div className="chart-header">
              <h3>Population Overview</h3>
            </div>
            <div className="chart-container">
              <PopulationChart creatures={creatures} />
            </div>
          </div>
          <div key="summary" className="stats-card">
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
        </ReactGridLayout>
      )}
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
      {/* You can add more medical-specific components here */}
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

interface DefenseTabProps {
  loading: boolean;
}

const DefenseTab: React.FC<DefenseTabProps> = ({ loading }) => {
  // Mock data - replace with actual API data when available
  const mockTurrets = [
    { id: 1, name: 'Auto-Cannon Turret', status: 'Operational', health: 100, ammo: 85, target: '12' },
    { id: 2, name: 'Mini-Turret', status: 'Operational', health: 100, ammo: 92, target: '5' },
    { id: 3, name: 'Uranium Slug Turret', status: 'Damaged', health: 65, ammo: 45, target: '17' },
    { id: 4, name: 'Charge Blaster', status: 'Operational', health: 100, ammo: 78, target: '21' },
  ];

  const mockThreatAssessment = {
    defenseScore: 725,
    threatLevel: 'Medium',
    recommendedImprovements: ['Repair damaged turrets', 'Add more mini-turrets', 'Stockpile more ammunition'],
    weakPoints: ['North wall section', 'Eastern flank']
  };

  const mockCombatHistory = [
    { id: 1, date: '2 days ago', event: 'Raid - Tribal', damageTaken: 120, damageDealt: 450, outcome: 'Victory' },
    { id: 2, date: '5 days ago', event: 'Mech Cluster', damageTaken: 340, damageDealt: 680, outcome: 'Victory' },
    { id: 3, date: '8 days ago', event: 'Infestation', damageTaken: 280, damageDealt: 320, outcome: 'Victory' },
    { id: 4, date: '12 days ago', event: 'Siege - Pirates', damageTaken: 560, damageDealt: 890, outcome: 'Victory' },
  ];

  return (
    <div className="defense-tab">

      {/* API Placeholder Notice */}
      <div className="api-notice">
        <div className="notice-icon">🚧</div>
        <div className="notice-content">
          <h4>Defense API Coming Soon</h4>
          <p>This section displays mock data. Real-time defense monitoring will be available when the RIMAPI defense endpoints are implemented.</p>
        </div>
      </div>

      {/* Defense Overview Header */}
      <div className="defense-overview">
        <div className="defense-header">
          <h2>🛡️ Colony Defense Systems</h2>
          <div className="defense-status">
            <span className="status-indicator operational">Operational</span>
            <span className="last-drill">Last combat drill: 3 days ago</span>
          </div>
        </div>
      </div>

      <div className="defense-grid">
        {/* Active Turrets Section */}
        <div className="defense-section turrets-section">
          <div className="section-header">
            <h3>🎯 Active Defense Turrets</h3>
            <span className="section-count">{mockTurrets.length} Turrets</span>
          </div>
          <div className="turrets-grid">
            {mockTurrets.map(turret => (
              <div key={turret.id} className={`turret-card ${turret.status.toLowerCase()}`}>
                <div className="turret-header">
                  <h4>{turret.name}</h4>
                  <span className={`status-badge ${turret.status.toLowerCase()}`}>
                    {turret.status}
                  </span>
                </div>
                <div className="turret-stats">
                  <div className="stat-row">
                    <span className="stat-label">Health:</span>
                    <div className="health-bar">
                      <div
                        className="health-fill"
                        style={{ width: `${turret.health}%` }}
                      ></div>
                    </div>
                    <span className="stat-value">{turret.health}%</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Ammo:</span>
                    <div className="ammo-bar">
                      <div
                        className="ammo-fill"
                        style={{ width: `${turret.ammo}%` }}
                      ></div>
                    </div>
                    <span className="stat-value">{turret.ammo}%</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Damage:</span>
                    <span className="stat-value target-status">{turret.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Assessment Section */}
        <div className="defense-section threat-section">
          <div className="section-header">
            <h3>📊 Threat Assessment</h3>
            <span className={`threat-level ${mockThreatAssessment.threatLevel.toLowerCase()}`}>
              {mockThreatAssessment.threatLevel} Threat
            </span>
          </div>
          <div className="threat-content">
            <div className="defense-score">
              <div className="score-circle">
                <span className="score-value">{mockThreatAssessment.defenseScore}</span>
                <span className="score-label">Defense Score</span>
              </div>
            </div>
            <div className="assessment-details">
              <div className="weak-points">
                <h4>Weak Points:</h4>
                <ul>
                  {mockThreatAssessment.weakPoints.map((point, index) => (
                    <li key={index}>📍 {point}</li>
                  ))}
                </ul>
              </div>
              <div className="recommendations">
                <h4>Recommended Improvements:</h4>
                <ul>
                  {mockThreatAssessment.recommendedImprovements.map((rec, index) => (
                    <li key={index}>✅ {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Combat History Section */}
        <div className="defense-section history-section">
          <div className="section-header">
            <h3>📈 Combat History</h3>
            <span className="history-count">Last {mockCombatHistory.length} Engagements</span>
          </div>
          <div className="combat-history">
            <div className="history-stats">
              <div className="history-stat">
                <span className="stat-number">{mockCombatHistory.length}</span>
                <span className="stat-label">Total Engagements</span>
              </div>
              <div className="history-stat">
                <span className="stat-number">{mockCombatHistory.filter(e => e.outcome === 'Victory').length}</span>
                <span className="stat-label">Victories</span>
              </div>
              <div className="history-stat">
                <span className="stat-number">
                  {Math.round(mockCombatHistory.reduce((acc, curr) => acc + curr.damageDealt, 0) / mockCombatHistory.length)}
                </span>
                <span className="stat-label">Avg Damage Dealt</span>
              </div>
            </div>
            <div className="engagements-list">
              {mockCombatHistory.map(engagement => (
                <div key={engagement.id} className="engagement-card">
                  <div className="engagement-header">
                    <span className="engagement-date">{engagement.date}</span>
                    <span className={`outcome-badge ${engagement.outcome.toLowerCase()}`}>
                      {engagement.outcome}
                    </span>
                  </div>
                  <div className="engagement-event">{engagement.event}</div>
                  <div className="engagement-stats">
                    <div className="damage-taken">
                      <span className="damage-label">Damage Taken:</span>
                      <span className="damage-value">{engagement.damageTaken}</span>
                    </div>
                    <div className="damage-dealt">
                      <span className="damage-label">Damage Dealt:</span>
                      <span className="damage-value">{engagement.damageDealt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
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