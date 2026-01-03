import React, { useState, useEffect, useRef } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './RimWorldDashboard.css';
import defaultBgImage from '../assets/defaultBackground.jpg';

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
import PresetsModal from './PresetsModal'; // Using the Modal now
import DashboardSettingsModal from './DashboardSettingsModal';

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
    savePreset, deletePreset, setSelectedPreset, presetBgImage, presetBgBlur,
    renamePreset, exportPresets, importPresets,
  } = useDashboardLayout();

  // 3. Local UI State
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isAddCardMenuOpen, setAddCardMenuOpen] = useState(false);
  const [isPresetsModalOpen, setPresetsModalOpen] = useState(false); // Renamed for clarity
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [medicalTabColonistFilter, setMedicalTabColonistFilter] = useState<string[]>([]);
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  const { addToast } = useToast();
  const trashRef = useRef<HTMLDivElement>(null);
  const ignoreLayoutChangeRef = useRef(false);

  const [targetBgImage, setTargetBgImage] = useState<string>(() => {
    return localStorage.getItem('dashboard_bg') || defaultBgImage;
  });

  const [backgroundBlur, setBackgroundBlur] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_bg_blur');
    return saved ? parseInt(saved) : 0;
  });

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  const [visibleBgImage, setVisibleBgImage] = useState<string>(defaultBgImage);

  // IMAGE PRELOADER EFFECT
  useEffect(() => {
    // If the image we want is already visible, do nothing
    if (targetBgImage === visibleBgImage) return;

    // Create a new image object in memory to download the file
    const img = new Image();
    img.src = targetBgImage;

    // Only swap the background when it's fully loaded
    img.onload = () => {
      setVisibleBgImage(targetBgImage);
    };

    // Fallback: If image fails, you might want to revert or just do nothing
    img.onerror = () => {
      console.warn("Failed to load background:", targetBgImage);
      // Optional: Revert to default if custom fails?
      // setVisibleBgImage(defaultBgImage); 
    };

  }, [targetBgImage, visibleBgImage]);

  // Helper to settings
  const handleSaveSettings = (newUrl: string, newBlur: number) => {
    // 1. Update visual state (Current View)
    setTargetBgImage(newUrl);
    setBackgroundBlur(newBlur);
    localStorage.setItem('dashboard_bg', newUrl);
    localStorage.setItem('dashboard_bg_blur', newBlur.toString());

    if (selectedPreset) {
      savePreset(selectedPreset, newUrl, newBlur);
      addToast({ type: 'success', title: `Settings saved to preset "${selectedPreset}"` });
    }
  };

  // React Grid Layout Sizing
  const { width, containerRef, mounted, measureWidth } = useContainerWidth({
    measureBeforeMount: true,
    initialWidth: 960
  });

  // Re-measure grid when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      setIsDashboardReady(false);

      const timer = setTimeout(() => {
        measureWidth();
        setIsDashboardReady(true);
      }, 100); // 100ms delay is usually enough

      return () => clearTimeout(timer);
    } else {
      setIsDashboardReady(false);
    }
  }, [activeTab, measureWidth, loading]);

  const availableCards = [
    'colonists', 'resources', 'power', 'population', 'colonySummary',
    'colonist', 'sseStatus', 'messageFeed', 'factionRelations',
    'caravanList', 'currentResearch', 'gameInfo'
  ];

  useEffect(() => {
    if (presetBgImage) {
      setTargetBgImage(presetBgImage);
      localStorage.setItem('dashboard_bg', presetBgImage);

      const newBlur = presetBgBlur || 0;
      setBackgroundBlur(newBlur);
      localStorage.setItem('dashboard_bg_blur', newBlur.toString());

      addToast({ type: 'info', title: 'Background loaded from preset', duration: 2000 });
    } else {
      setTargetBgImage(defaultBgImage);
      setBackgroundBlur(0);
    }
  }, [presetBgImage, presetBgBlur, addToast]);

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
        // 1. Block layout saves
        ignoreLayoutChangeRef.current = true;

        // 2. Delete the item
        onRemoveItem(newItem.i);
        trashRef.current.classList.remove('over');

        // 3. Unblock layout saves after a short delay
        // This covers all the extra events ReactGridLayout fires immediately after dropping
        setTimeout(() => {
          ignoreLayoutChangeRef.current = false;
        }, 200);

        return;
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
              {mounted && isDashboardReady && (
                <ReactGridLayout
                  key="dashboard-grid"
                  className="layout"
                  layout={layout}
                  width={width}
                  onLayoutChange={(newLayout) => {
                    // Check if we are deleting
                    console.log('onLayoutChange, ignoreLayoutChangeRef=', ignoreLayoutChangeRef.current)
                    if (ignoreLayoutChangeRef.current) {
                      return;
                    }
                    handleLayoutChange(newLayout);
                  }}
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
                          autoRefresh={autoRefresh}
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
      <div
        className="dashboard-background"
        style={{
          backgroundImage: `url(${visibleBgImage})`,
          filter: `blur(${backgroundBlur}px)`
        }}
      />

      {/* --- HEADER --- */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>RimWorld Colony Dashboard</h1>
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
            {/* ADD CARD BUTTON */}
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

            {/* PRESET SELECT BUTTON */}
            <div className="presets-container">
              <button
                className="presets-btn"
                onClick={() => setPresetsModalOpen(true)}
              >
                {selectedPreset ? `Preset: ${selectedPreset}` : 'Presets / Save'}
              </button>
            </div>

            {/* PRESET SETTINGS BUTTON */}
            <div className="settings-container">
              <button
                className="settings-btn-trigger"
                onClick={() => setSettingsModalOpen(true)}
              >
                Preset Settings
              </button>
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

      {/* --- MODALS (Placed at Root Level to fix Z-Index issues) --- */}
      {editingCardId && (
        <ColonySummarySettingsModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          settings={cardSettings[editingCardId]}
          onSettingsChange={(newS) => handleCardSettingsChange(editingCardId, newS)}
        />
      )}

      {/* Presets Modal - Now correctly placed at root level */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        presets={presets}
        selectedPreset={selectedPreset}
        onSave={(name) => {
          const success = savePreset(name, targetBgImage, backgroundBlur);
          if (success) addToast({ type: 'success', title: 'Preset saved!' });
        }}
        onRename={(oldName, newName) => {
          const success = renamePreset(oldName, newName);
          if (success) addToast({ type: 'success', title: 'Preset renamed' });
          return success;
        }}
        onSelect={(name) => setSelectedPreset(name)}
        onDelete={(name) => {
          deletePreset(name);
          addToast({ type: 'success', title: 'Preset deleted' });
        }}
        onExport={() => {
          const json = exportPresets();
          const blob = new Blob([json], { type: 'application/json' });
          const href = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = href;
          link.download = `rimworld_dashboard_presets_${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          addToast({ type: 'success', title: 'Presets exported to file' });
        }}
        onImport={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result as string;
            const success = importPresets(text);
            if (success) addToast({ type: 'success', title: 'Presets imported successfully' });
            else addToast({ type: 'error', title: 'Invalid preset file' });
          };
          reader.readAsText(file);
        }}
      />

      <DashboardSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentBgUrl={targetBgImage}
        defaultBgUrl={defaultBgImage}
        currentBlur={backgroundBlur}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default RimWorldDashboard;