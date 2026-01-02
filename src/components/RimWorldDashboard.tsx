// src/components/RimWorldDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { sseService } from '../services/sseService';
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
import CaravanListCard from './CaravanListCard';
import ColonySummary, { ColonySummarySettings } from './ColonySummary';
import ColonySummarySettingsModal from './ColonySummarySettingsModal';
import PresetsContextMenu from './PresetsContextMenu';
import MessageFeedCard from './MessageFeedCard';
import SseStatusCard from './SseStatusCard';
import ColonistCard from './ColonistCard';
import FactionRelationsCard from './FactionRelationsCard';

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
    { i: 'colonists', x: 0, y: 0, w: 6, h: 2, isBounded: true },
    { i: 'resources', x: 8, y: 0, w: 6, h: 2, isBounded: true },
    { i: 'power', x: 0, y: 8, w: 4, h: 2, isBounded: true },
    { i: 'population', x: 4, y: 2, w: 4, h: 2, isBounded: true },
    { i: 'colonySummary', x: 8, y: 2, w: 4, h: 2, isBounded: true },
  ];

  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [isAddCardMenuOpen, setAddCardMenuOpen] = useState(false);
  const trashRef = useRef<HTMLDivElement>(null);
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 960
  });
  const presetChangeRef = useRef(false);
  const deleteChangeRef = useRef(false);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Force measurement when dashboard tab is selected
      const timer = setTimeout(() => {
        measureWidth();
      }, 50); // Small delay to ensure DOM is ready

      return () => clearTimeout(timer);
    }
  }, [activeTab, measureWidth]);

  // Also measure on initial mount and after data loads
  useEffect(() => {
    if (!loading && data && activeTab === 'dashboard') {
      const timer = setTimeout(() => {
        measureWidth();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, data, activeTab, measureWidth]);

  // Update the presets and selectedPreset initialization
  const [presets, setPresets] = useState<{ name: string, layout: Layout, cardSettings: { [key: string]: any } }[]>(() => {
    const savedPresets = localStorage.getItem('dashboard_presets');
    return savedPresets ? JSON.parse(savedPresets) : [];
  });

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const lastPreset = localStorage.getItem('last_selected_preset') || "";
    const savedPresets = localStorage.getItem('dashboard_presets');

    // Check if the last selected preset actually exists in the saved presets
    if (lastPreset && savedPresets) {
      const parsedPresets = JSON.parse(savedPresets);
      const presetExists = parsedPresets.some((p: { name: string }) => p.name === lastPreset);
      return presetExists ? lastPreset : "";
    }
    return "";
  });

  const [isPresetsMenuOpen, setPresetsMenuOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<{ [key: string]: any }>({});
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  useEffect(() => {
    // Apply the selected preset layout if one is selected
    if (selectedPreset && presets.length > 0) {
      const preset = presets.find(p => p.name === selectedPreset);
      if (preset) {
        presetChangeRef.current = true;
        setLayout(preset.layout);
        setCardSettings(preset.cardSettings || {});
      }
    }
  }, [selectedPreset, presets]); // Run when selectedPreset or presets change

  const handleOpenColonySummarySettings = (cardId: string) => {
    setEditingCardId(cardId);
  };

  const handleSavePreset = (presetName: string) => {
    if (presetName) {
      const newPreset = { name: presetName, layout: layout, cardSettings: cardSettings };
      const updatedPresets = [...presets.filter(p => p.name !== presetName), newPreset];
      setPresets(updatedPresets);
      localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));

      setSelectedPreset(presetName);
      localStorage.setItem('last_selected_preset', presetName);

      addToast({
        type: 'success',
        title: `Preset '${presetName}' saved!`,
      });
      return true;
    } else {
      addToast({
        type: 'warning',
        title: 'Please enter a name for the preset.',
      });
      return false;
    }
  };

  const handlePresetSelect = (presetName: string) => {
    if (presetName) {
      const preset = presets.find(p => p.name === presetName);
      if (preset) {
        presetChangeRef.current = true;
        setLayout(preset.layout);
        setCardSettings(preset.cardSettings || {});
      }
      setSelectedPreset(presetName);
      localStorage.setItem('last_selected_preset', presetName);
    } else {
      // When selecting "Create Preset" (empty string)
      presetChangeRef.current = true;
      setLayout(initialLayout);
      setCardSettings({});
      setSelectedPreset("");
      localStorage.removeItem('last_selected_preset');
    }
  };

  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const handleCardSettingsChange = (cardId: string, newSettings: any) => {
    setCardSettings(prev => ({
      ...prev,
      [cardId]: newSettings
    }));
  };

  const saveLayoutToPreset = useCallback(debounce((layout: Layout) => {
    if (selectedPreset) {
      setPresets(prevPresets => {
        const updatedPresets = prevPresets.map(p =>
          p.name === selectedPreset ? { ...p, layout: layout } : p
        );
        localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
        return updatedPresets;
      });
      addToast({
        type: 'info',
        title: `Preset '${selectedPreset}' layout updated.`,
        duration: 1500,
      });
    }
  }, 1000), [selectedPreset, addToast]);

  const onLayoutChange = (newLayout: Layout) => {
    // Skip processing if this change was triggered by a preset
    if (presetChangeRef.current) {
      presetChangeRef.current = false;
      return;
    }
    if (deleteChangeRef.current) {
      deleteChangeRef.current = false;
      return;
    }

    // Make all items bounded
    const boundedLayout = newLayout.map(item => ({
      ...item,
      isBounded: true
    }));

    setLayout(boundedLayout);
    saveLayoutToPreset(boundedLayout);
  };

  const handleSelectColonistForCard = (cardId: string, colonistId: number) => {
    setCardSettings(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], colonistId: colonistId }
    }));
  };

  const saveCardSettingsToPreset = useCallback(debounce((settings: { [key: string]: any }) => {
    if (selectedPreset) {
      setPresets(prevPresets => {
        const updatedPresets = prevPresets.map(p =>
          p.name === selectedPreset ? { ...p, cardSettings: settings } : p
        );
        localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
        return updatedPresets;
      });
    }
  }, 1000), [selectedPreset]);

  useEffect(() => {
    saveCardSettingsToPreset(cardSettings);
  }, [cardSettings, saveCardSettingsToPreset]);

  const handleDeletePreset = (presetName: string) => {
    if (presetName) {
      const updatedPresets = presets.filter(p => p.name !== presetName);
      setPresets(updatedPresets);
      localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
      if (selectedPreset === presetName) {
        setSelectedPreset(""); // Go back to default
      }
      addToast({
        type: 'success',
        title: `Preset '${presetName}' deleted!`,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Please select a preset to delete.',
      });
    }
  };

  const onRemoveItem = (itemId: string) => {
    setLayout(layout.filter(item => item.i !== itemId));
  };

  const onAddItem = (itemId: string) => {
    const newItemId = `${itemId}_${new Date().getTime()}`;
    const newItem: Layout[number] = {
      i: newItemId,
      x: (layout.length * 4) % 12,
      y: Infinity,
      w: 4,
      h: 2,
    };
    if (itemId === 'colonist') {
      setCardSettings(prev => ({ ...prev, [newItemId]: { colonistId: 0 } }));
    }
    if (itemId === 'colonySummary') {
      setCardSettings(prev => ({
        ...prev,
        [newItemId]: {
          showColonists: true,
          showAnimals: true,
          showItems: true,
          showWealth: true,
        } as ColonySummarySettings
      }));
    }
    const newLayout = [...layout, newItem];
    setLayout(newLayout);

    if (selectedPreset) {
      const updatedPresets = presets.map(p =>
        p.name === selectedPreset ? { ...p, layout: newLayout } : p
      );
      setPresets(updatedPresets);
      localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
    }

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
        deleteChangeRef.current = true;
        const newLayout = layout.filter(item => item.i !== newItem.i);
        setLayout(newLayout);

        // Auto-save to current preset if one is selected
        if (selectedPreset) {
          const updatedPresets = presets.map(p =>
            p.name === selectedPreset ? { ...p, layout: newLayout } : p
          );
          setPresets(updatedPresets);
          localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));

          // Show auto-save notification
          addToast({
            type: 'info',
            title: `Preset '${selectedPreset}' updated (card removed)`,
            duration: 1500,
          });
        }
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

  const availableCards = ['colonists', 'resources', 'power', 'population', 'colonySummary', 'colonist', 'sseStatus', 'messageFeed', 'factionRelations', 'caravanList'];

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
      case 'caravanList':
        return <CaravanListCard />;
      case 'colonists':
        return (
          <div className="chart-card-content">
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
          <div className="chart-card-content">
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
          <div className="chart-card-content">
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
          <div className="chart-card-content">
            <div className="chart-header"><h3>Population Overview</h3></div>
            <div className="chart-container"><PopulationChart creatures={creatures} /></div>
          </div>
        );
      case 'colonySummary':
        const summarySettings = cardSettings[item.i] || { showColonists: true, showAnimals: true, showItems: true, showWealth: true };
        return (
          <ColonySummary
            data={data}
            settings={summarySettings}
            onSettingsChange={(newSettings) => handleCardSettingsChange(item.i, newSettings)}
            onOpenSettings={() => handleOpenColonySummarySettings(item.i)}
          />
        );
      case 'colonist':
        const colonistId = cardSettings[item.i]?.colonistId || 0;
        return (
          <div className="colonist-card-wrapper">
            <ColonistCard
              colonistId={colonistId}
              size={{ w: item.w, h: item.h }}
              onSelectColonist={(newColonistId) => handleSelectColonistForCard(item.i, newColonistId)}
              onViewHealth={handleOpenMedicalTabWithColonist}
              onViewSkills={(colonistName) => {
                // You can implement skills view if needed
                console.log('View skills for:', colonistName);
              }}
              autoRefresh={autoRefresh} // Pass the dashboard's autoRefresh state
              lastUpdated={lastUpdated} // Pass the dashboard's lastUpdated timestamp
            />
          </div>

        );
      case 'sseStatus':
        return <SseStatusCard />;
      case 'messageFeed':
        return <MessageFeedCard />;
      case 'factionRelations':
        return (
          <div className="faction-card-wrapper">
            <FactionRelationsCard
              settings={cardSettings[item.i]} // Pass saved settings
              onSettingsChange={(newSettings) => {
                // Update card settings with layout data
                setCardSettings(prev => ({
                  ...prev,
                  [item.i]: {
                    ...prev[item.i],
                    ...newSettings
                  }
                }));
              }}
            />
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
          <div className="tab-content dashboard-tab" >
            <div className="dashboard-grid-container" ref={containerRef}>
              {(mounted) && (
                <ReactGridLayout
                  key={`grid-${width}`} // Force remount when width changes
                  className="layout"
                  layout={layout}
                  width={width} // Fixed to match header/tabs width
                  onLayoutChange={onLayoutChange}
                  onDragStop={onDragStop as any}
                  onDrag={onDrag as any}
                  dragConfig={{
                    enabled: true,
                    cancel: '.layout-drag-ignore, .faction-item:not(.drag-handle)'
                  }}
                >
                  {layout.map(item => (
                    <div key={item.i} className="grid-item">
                      <div className="grid-item-content">
                        {renderCard(item)}
                      </div>
                      <div className="react-resizable-handle" />
                    </div>
                  ))}
                </ReactGridLayout>
              )}
            </div>
          </div >
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
          <div className="dashboard-controls-left">
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
            <div className="presets-container">
              <button className="presets-btn" onClick={() => setPresetsMenuOpen(!isPresetsMenuOpen)}>
                {selectedPreset || 'Create Preset'}
              </button>
              {isPresetsMenuOpen && (
                <PresetsContextMenu
                  presets={presets}
                  selectedPreset={selectedPreset}
                  onSave={handleSavePreset}
                  onSelect={handlePresetSelect}
                  onDelete={handleDeletePreset}
                  onClose={() => setPresetsMenuOpen(false)}
                />
              )}
            </div>
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

      {editingCardId && (
        <ColonySummarySettingsModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          settings={cardSettings[editingCardId] || { showColonists: true, showAnimals: true, showItems: true, showWealth: true }}
          onSettingsChange={(newSettings) => {
            handleCardSettingsChange(editingCardId, newSettings);
          }}
        />
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