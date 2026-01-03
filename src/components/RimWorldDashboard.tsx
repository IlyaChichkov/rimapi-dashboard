import React, { useState, useEffect, useRef } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './RimWorldDashboard.css';

// Hooks
import { useRimWorldData } from '../hooks/useRimworldData';
import { useDashboardLayout } from '../hooks/useDashboardLayout';

// Types
import { DashboardTab } from '../types/dashboardTypes';

// Sub-components
import LoadingScreen from './LoadingScreen';
import ConnectionErrorScreen from './ConnectionErrorScreen';
import Footer from './Footer';
import { DashboardCardRegistry } from './DashboardCardRegistry';
import { useToast } from './ToastContext';

// Tabs
import ResearchCards from './ResearchCards';
import MedicalAlertsCard from './MedicalAlertsCard';
import ColonistsTab from './ColonistsTab';
import ResourcesDashboard from './ResourcesDashboard';
import DevTab from './DevTab';

// UI Helpers
import ColonySummarySettingsModal from './ColonySummarySettingsModal';
import PresetsContextMenu from './PresetsContextMenu';

interface RimWorldDashboardProps {
  apiUrl: string;
  onResetConfig: () => void;
  onGameStateChange: () => void;
}

const RimWorldDashboard: React.FC<RimWorldDashboardProps> = ({
  apiUrl, onResetConfig, onGameStateChange
}) => {
  // 1. Data Hook
  const {
    data, loading, error, lastUpdated, autoRefresh, setAutoRefresh, refresh, getSortedColonists
  } = useRimWorldData(apiUrl, onGameStateChange);

  // 2. Layout Hook
  const {
    layout, cardSettings, presets, selectedPreset,
    handleLayoutChange, handleCardSettingsChange, onAddItem, onRemoveItem,
    savePreset, deletePreset, setSelectedPreset
  } = useDashboardLayout();

  // 3. Local UI State
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isAddCardMenuOpen, setAddCardMenuOpen] = useState(false);
  const [isPresetsMenuOpen, setPresetsMenuOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [medicalTabColonistFilter, setMedicalTabColonistFilter] = useState<string[]>([]);

  const { addToast } = useToast();
  const trashRef = useRef<HTMLDivElement>(null);

  // React Grid Layout Sizing
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 960
  });

  // Re-measure grid when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      setTimeout(() => measureWidth(), 100);
    }
  }, [activeTab, measureWidth, loading]);

  const availableCards = [
    'colonists', 'resources', 'power', 'population', 'colonySummary',
    'colonist', 'sseStatus', 'messageFeed', 'factionRelations',
    'caravanList', 'currentResearch'
  ];

  // -- Handlers --

  const handleResizeStop = () => {
    setTimeout(() => {
      // Force ChartJS resize
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  const onDragStop = (layout: any, oldItem: any, newItem: any, placeholder: any, e: MouseEvent) => {
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const isOverTrash = e.clientX > trashRect.left && e.clientX < trashRect.right &&
        e.clientY > trashRect.top && e.clientY < trashRect.bottom;
      if (isOverTrash) {
        onRemoveItem(newItem.i);
        trashRef.current.classList.remove('over');
      }
    }
    handleLayoutChange(layout);
  };

  const onDrag = (layout: any, oldItem: any, newItem: any, placeholder: any, e: MouseEvent) => {
    if (trashRef.current) {
      const trashRect = trashRef.current.getBoundingClientRect();
      const isOverTrash = e.clientX > trashRect.left && e.clientX < trashRect.right &&
        e.clientY > trashRect.top && e.clientY < trashRect.bottom;
      if (isOverTrash) trashRef.current.classList.add('over');
      else trashRef.current.classList.remove('over');
    }
  };

  const handleOpenMedicalTabWithColonist = (colonistName: string) => {
    setMedicalTabColonistFilter([colonistName]);
    setActiveTab('medical');
  };

  // -- Render Logic --

  if (loading && !data && !error) return <LoadingScreen />;
  if (error) return <ConnectionErrorScreen error={error} apiUrl={apiUrl} onRetry={refresh} onChangeUrl={onResetConfig} />;

  // Destructure data for cleaner access
  const colonists = data?.colonists || [];
  const resources = data?.resources || { categories: [] };
  const power = data?.power || {};
  const creatures = data?.creatures || {};
  const gameState = data?.gameState || {};
  const weather = data?.weather || {};
  const map_datetime = data?.map_datetime || {};

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="tab-content dashboard-tab">
            <div className="dashboard-grid-container" ref={containerRef}>
              {mounted && (
                <ReactGridLayout
                  key={`grid-${width}`}
                  className="layout"
                  layout={layout}
                  width={width}
                  onLayoutChange={handleLayoutChange}
                  // Restored "as any" casts exactly as requested to fix TS errors
                  onDragStop={onDragStop as any}
                  onDrag={onDrag as any}
                  onResizeStop={handleResizeStop as any}
                  dragConfig={{
                    enabled: true,
                    cancel: '.layout-drag-ignore, .faction-item:not(.drag-handle)'
                  }}
                >
                  {layout.map(item => (
                    <div key={item.i} className="grid-item">
                      <div className="grid-item-content">
                        <DashboardCardRegistry
                          item={item}
                          data={data!}
                          cardSettings={cardSettings}
                          onSettingsChange={handleCardSettingsChange}
                          onOpenSettings={(id) => setEditingCardId(id)}
                          colonists={colonists}
                          resources={resources}
                          power={power}
                          creatures={creatures}
                          getSortedColonists={getSortedColonists}
                        />
                      </div>
                      <div className="react-resizable-handle" />
                    </div>
                  ))}
                </ReactGridLayout>
              )}
            </div>
          </div>
        );
      case 'medical':
        return <div className="medical-tab"><MedicalAlertsCard colonistsDetailed={data?.colonistsDetailed || []} loading={loading} initialColonistFilter={medicalTabColonistFilter} /></div>;
      case 'research':
        return <ResearchCards researchProgress={data?.researchProgress} researchFinished={data?.researchFinished} researchSummary={data?.researchSummary} loading={loading} />;
      case 'colonists':
        return <ColonistsTab colonistsDetailed={data?.colonistsDetailed || []} loading={loading} onViewHealth={handleOpenMedicalTabWithColonist} />;
      case 'resources':
        return <div className="resources-tab"><ResourcesDashboard /></div>;
      case 'tools':
        return <DevTab modsInfo={data?.modsInfo || []} loading={loading} />;
      default: return null;
    }
  };

  return (
    <div className="rimworld-dashboard">
      {/* --- HEADER --- */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>RimWorld Colony Dashboard</h1>
          <div className="game-info">
            <span>Date: {map_datetime.datetime || 'Unknown'}</span>
            <span>Weather: {weather.weather || 'Unknown'}</span>
            <span>Temp: {Math.round(weather.temperature || 0)}°C</span>
            <span>Storyteller: {gameState.storyteller || 'Unknown'}</span>
            {lastUpdated && <div className="last-updated">Last updated: {lastUpdated.toLocaleTimeString()}</div>}
          </div>
        </div>
        <div className="header-controls">
          <button onClick={() => setAutoRefresh(!autoRefresh)} className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}>
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={refresh} className="refresh-btn">Refresh Now</button>
          <button onClick={onResetConfig} className="refresh-btn">Change API URL</button>
        </div>
      </header>

      {/* --- TABS --- */}
      <div className="tabs-navigation">
        {(['dashboard', 'medical', 'research', 'colonists', 'resources', 'tools'] as DashboardTab[]).map(tab => (
          <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* --- DASHBOARD ACTIONS (Add Card / Presets) --- */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-actions-bar">
          <div className="dashboard-controls-left">
            <div className="add-card-container">
              <button className="add-card-btn" onClick={() => setAddCardMenuOpen(!isAddCardMenuOpen)}>Add Card</button>
              {isAddCardMenuOpen && (
                <div className="add-card-menu">
                  {availableCards.map(cardId => (
                    <button key={cardId} onClick={() => { onAddItem(cardId); setAddCardMenuOpen(false); }}>{cardId}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="presets-container">
              <button className="presets-btn" onClick={() => setPresetsMenuOpen(!isPresetsMenuOpen)}>
                {selectedPreset ? `Preset: ${selectedPreset}` : 'Create Preset'}
              </button>
              {isPresetsMenuOpen && (
                <PresetsContextMenu
                  presets={presets}
                  selectedPreset={selectedPreset}
                  onSave={(name) => {
                    const success = savePreset(name);
                    if (success) addToast({ type: 'success', title: 'Preset saved' });
                    return success;
                  }}
                  onSelect={(name) => { setSelectedPreset(name); setPresetsMenuOpen(false); }}
                  onDelete={(name) => { deletePreset(name); addToast({ type: 'success', title: 'Preset deleted' }); }}
                  onClose={() => setPresetsMenuOpen(false)}
                />
              )}
            </div>
          </div>
          <div className="trash-zone" ref={trashRef}><span>🗑️ Drag here to delete</span></div>
        </div>
      )}

      {/* --- CONTENT --- */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      {autoRefresh && <div className="auto-refresh-indicator"><div className="refresh-pulse"></div>Auto-refreshing...</div>}

      <div className='footer-spacer'></div>
      <Footer />

      {/* --- MODALS --- */}
      {editingCardId && (
        <ColonySummarySettingsModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          settings={cardSettings[editingCardId]}
          onSettingsChange={(newS) => handleCardSettingsChange(editingCardId, newS)}
        />
      )}
    </div>
  );
};

export default RimWorldDashboard;