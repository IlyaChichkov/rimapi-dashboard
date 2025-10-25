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
import { RimWorldData } from '../types';
import './RimWorldDashboard.css';

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
        <div className="chart-card">
          <div className="chart-header">
            <h3>Colonist Health & Mood</h3>
            {loading && <div className="chart-loading">Updating...</div>}
          </div>
          <div className="chart-container">
            {colonists.length > 0 ? (
              <ColonistStatsChart colonists={colonists} />
            ) : (
              <div className="no-data">No colonist data available</div>
            )}
          </div>
        </div>

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
            <h3>Power Management</h3>
            <div className="power-status">
              Net: {(power.total_possible_power || 0) - (power.total_consumption || 0)}W
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
            {loading && <div className="chart-loading">Updating...</div>}
          </div>
          <div className="chart-container">
            <PopulationChart creatures={creatures} />
          </div>
        </div>

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