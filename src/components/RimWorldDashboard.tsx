// src/components/RimWorldDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
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

const getChartSize = (colonistsCount: number): number => {
  if (colonistsCount <= 5) return 1;    // Normal size
  if (colonistsCount <= 10) return 2;   // 2x width
  if (colonistsCount <= 15) return 3;   // 3x width
  return 4;                             // 4x width for 16+ colonists
};

const renderColonistCharts = (colonists: Colonist[]) => {
  if (colonists.length <= 10) {
    return (
      <div className={`chart-card colonist-stats-card size-${getChartSize(colonists.length)}`}>
        {/* Single chart for <= 10 colonists */}
        <div className="chart-header">
          <h3>Colonist Health & Mood</h3>
          <div className="colonist-count-badge">
            {colonists.length} Colonists
          </div>
        </div>
        <div className="chart-container">
          <ColonistStatsChart colonists={colonists} />
        </div>
      </div>
    );
  }

  // Split colonists into chunks for mobile
  const chunkSize = 8;
  const chunks = [];
  for (let i = 0; i < colonists.length; i += chunkSize) {
    chunks.push(colonists.slice(i, i + chunkSize));
  }

  return chunks.map((chunk, index) => (
    <div key={index} className="chart-card colonist-stats-card mobile-split">
      <div className="chart-header">
        <h3>Colonists {index * chunkSize + 1}-{index * chunkSize + chunk.length}</h3>
        <div className="colonist-count-badge">
          {chunk.length} Colonists
        </div>
      </div>
      <div className="chart-container">
        <ColonistStatsChart colonists={chunk} />
      </div>
    </div>
  ));
};


interface RimWorldDashboardProps {
  apiUrl: string;
  onResetConfig: () => void;
}

const RimWorldDashboard: React.FC<RimWorldDashboardProps> = ({
  apiUrl, 
  onResetConfig
}) => {
  const [data, setData] = useState<RimWorldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [sortBy, setSortBy] = useState<'name' | 'mood'>('name');

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
  }, []);

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

  const colonistChartSize = getChartSize(colonists.length);

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

      <div className="dashboard-grid">
        {/* Colonist Stats */}
        {isMobile? (
          renderColonistCharts(colonists)
          ) : (<div 
          className={`chart-card colonist-stats-card size-${colonistChartSize}`}
          data-colonist-count={colonists.length}
          >
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
        )}

        {/* Resource Distribution */}
        <div className="chart-card">
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

        {/* Power Management */}
        <div className="chart-card">
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

        {/* Population Overview */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Population Overview</h3>
          </div>
          <div className="chart-container">
            <PopulationChart creatures={creatures} />
          </div>
        </div>

        {/* Research Cards */}
        <ResearchCards 
          researchProgress={researchProgress}
          researchFinished={researchFinished}
          researchSummary={researchSummary}
          loading={loading}
        />

        {/* Quick Stats */}
        <div className="stats-card">
          <h3>Colony Summary</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{colonists.length}</div>
              <div className="stat-label">Colonists</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{creatures.animals_count || 0}</div>
              <div className="stat-label">Animals</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{resources.total_items || 0}</div>
              <div className="stat-label">Total Items</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">${Math.round(resources.total_market_value || 0) }</div>
              <div className="stat-label">Wealth</div>
            </div>
          </div>
        </div>
      </div>

      {autoRefresh && (
        <div className="auto-refresh-indicator">
          <div className="refresh-pulse"></div>
          Auto-refreshing every 5 seconds...
        </div>
      )}
    </div>
  );
};

export default RimWorldDashboard;