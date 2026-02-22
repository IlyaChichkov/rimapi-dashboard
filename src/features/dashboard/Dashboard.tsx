import React, { useState, useEffect, useRef } from 'react';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Dashboard.css';
import defaultBgImage from '@/assets/defaultBackground.jpg';

// Hooks
import { useRimWorldData } from '@/hooks/useRimworldData';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';

// Types
import { DashboardTab } from '@/types/dashboardTypes';

// Sub-components
import LoadingScreen from '@/components/common/LoadingScreen';
import ConnectionErrorScreen from '@/components/common/ConnectionErrorScreen';
import Footer from '@/components/common/Footer';
import { DashboardCardRegistry } from '@/components/widgets/common/DashboardCardRegistry';
import { useToast } from '@/components/feedback/ToastContext';
import AddCardModal, { CardDefinition } from './modals/AddCardModal';

// Tabs
import ResearchCards from '@/features/research/ResearchCards';
import MedicalAlertsCard from '@/features/medical/MedicalAlertsCard';
import ColonistsTab from '@/features/colonists/ColonistsTab';
import ResourcesDashboard from '@/features/resources/ResourcesDashboard';
import DevTab from '@/features/developers/DevTab';

// UI Helpers
import ColonySummarySettingsModal from '@/features/dashboard/modals/ColonySummarySettingsModal';
import PresetsModal from '@/features/dashboard/modals/PresetsModal';
import DashboardSettingsModal from '@/features/dashboard/modals/DashboardSettingsModal';
import { useAutoRefresh } from '@/components/context/AutoRefreshContext';

interface RimWorldDashboardProps {
  apiUrl: string;
  onResetConfig: () => void;
  onGameStateChange: () => void;
}

// --- DEFINE CARD METADATA ---
const CARD_DEFINITIONS: CardDefinition[] = [
  { id: 'gameInfo', title: 'Game Info', description: 'Date, weather, storyteller, and sync status.', icon: '🌍' },
  { id: 'colonists', title: 'Colonist Charts', description: 'Charts for mood, health, and needs overview.', icon: '📊' },
  { id: 'resources', title: 'Resource Summary', description: 'Distribution of items and wealth categories.', icon: '📦' },
  { id: 'power', title: 'Power Grid', description: 'Generation vs. Consumption battery status.', icon: '⚡' },
  { id: 'population', title: 'Population', description: 'Counts for colonists, prisoners, and enemies.', icon: '👥' },
  { id: 'messageFeed', title: 'Message Feed', description: 'Live log of in-game letters and messages.', icon: '📩' },
  { id: 'factionRelations', title: 'Factions', description: 'List of factions and goodwill status.', icon: '🤝' },
  { id: 'currentResearch', title: 'Research', description: 'Current project progress bar.', icon: '🔬' },
  { id: 'colonist', title: 'Single Colonist', description: 'Detailed inspector for a specific pawn.', icon: '👤' },
  { id: 'colonySummary', title: 'Colony Summary', description: 'Text-based stats like total wealth.', icon: '📝' },
  { id: 'caravanList', title: 'Caravans', description: 'Active world map caravans.', icon: '🐫' },
  { id: 'globalMap', title: 'World Map', description: 'World map.', icon: '🗺️' },
  { id: 'oreScanner', title: 'Ore Scanner', description: 'Scan for valuable resources.', icon: '💎' },
  { id: 'topIncidents', title: 'Top Incidents', description: 'List of events with highest probability of occurring next.', icon: '🎲' },
  { id: 'timeControls', title: 'Time Controls', description: 'Manage game speed and pause state.', icon: '⏱️' },
  // { id: 'sseStatus', title: 'Connection Status', description: 'Debug info for API connection.', icon: '🔌' },
];

const RimWorldDashboard: React.FC<RimWorldDashboardProps> = ({
  apiUrl, onResetConfig, onGameStateChange
}) => {
  // 1. Get Global Refresh Settings
  const { isAutoRefreshEnabled, toggleAutoRefresh, triggerManualRefresh, refreshSignal } = useAutoRefresh();

  // 2. Data Hook (Pass these values into your hook so it knows when to update!)
  // Note: You will need to slightly update useRimWorldData to accept these props or use the context inside it.
  const {
    data, loading, error, refresh, getSortedColonists
  } = useRimWorldData(apiUrl, onGameStateChange, isAutoRefreshEnabled, refreshSignal);

  // 2. Layout Hook
  const {
    layout, cardSettings, presets, selectedPreset,
    handleLayoutChange, handleCardSettingsChange, onAddItem, onRemoveItem,
    savePreset, deletePreset, setSelectedPreset, presetBgImage, presetBgBlur,
    renamePreset, exportPresets, importPresets,
  } = useDashboardLayout();

  // 3. Local UI State
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isAddCardModalOpen, setAddCardModalOpen] = useState(false);
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

  const [backgroundOverlay, setBackgroundOverlay] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_bg_overlay');
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
  const handleSaveSettings = (newUrl: string, newBlur: number, newOverlay: number) => {
    setTargetBgImage(newUrl);
    setBackgroundBlur(newBlur);
    setBackgroundOverlay(newOverlay);

    localStorage.setItem('dashboard_bg', newUrl);
    localStorage.setItem('dashboard_bg_blur', newBlur.toString());
    localStorage.setItem('dashboard_bg_overlay', newOverlay.toString());

    if (selectedPreset) {
      savePreset(selectedPreset, newUrl, newBlur);
      addToast({ type: 'success', title: `Settings saved to preset "${selectedPreset}"` });
    }
  };

  const getBackgroundStyle = () => {
    const style: React.CSSProperties = {
      filter: `blur(${backgroundBlur}px)`,
    };

    if (backgroundOverlay === 0) {
      style.backgroundImage = `url(${visibleBgImage})`;
    } else {
      // Create a linear gradient overlay
      const opacity = Math.abs(backgroundOverlay) / 100;
      // Negative = Black, Positive = White
      const color = backgroundOverlay < 0 ? `rgba(0,0,0,${opacity})` : `rgba(255,255,255,${opacity})`;
      style.backgroundImage = `linear-gradient(${color}, ${color}), url(${visibleBgImage})`;
    }

    return style;
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
  const gameState = data?.gameState;
  const weather = data?.weather || {};
  const map_datetime = data?.map_datetime || {};

  if (gameState && gameState.program_state !== "Playing") {
    return (
      <div className="rimworld-dashboard">
        <div className="dashboard-background" style={getBackgroundStyle()} />
        <div className="server-waiting-screen" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', color: 'white', zIndex: 10, position: 'relative'
        }}>
          <h2>Server is currently at: {gameState.program_state}</h2>
          <p>Waiting for the map to load or a player to start the simulation...</p>
          <div className="refresh-pulse" style={{ marginTop: '20px' }}></div>
          <button
            onClick={refresh}
            className="nav-ctrl-btn primary"
            style={{ marginTop: '20px' }}
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

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
                    cancel: '.layout-drag-ignore, .faction-item:not(.drag-handle) .dashboard-card-body button, .dashboard-card-body input, .dashboard-card-body select, .dashboard-card-body textarea'
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
                          autoRefresh={isAutoRefreshEnabled}
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
        style={getBackgroundStyle()}
      />

      {/* --- UNIFIED NAVBAR --- */}
      <nav className="dashboard-navbar">

        {/* Left: Brand */}
        <div className="nav-brand">
          <h1>RimWorld Dashboard</h1>
        </div>

        {/* Center: Tabs */}
        <div className="nav-tabs">
          {(['dashboard', 'medical', 'research', 'colonists', 'resources', 'tools'] as DashboardTab[]).map(tab => (
            <button
              key={tab}
              className={`nav-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: Controls */}
        <div className="nav-controls">
          <button
            onClick={toggleAutoRefresh}
            className={`nav-ctrl-btn auto ${isAutoRefreshEnabled ? 'active' : ''}`}
            title="Toggle Auto-Refresh"
          >
            {isAutoRefreshEnabled ? '⚡ On' : '⏸️ Off'}
          </button>

          <button onClick={triggerManualRefresh} className="nav-ctrl-btn primary" title="Force Refresh">
            🔄 Refresh
          </button>

          <button onClick={onResetConfig} className="nav-ctrl-btn" title="Change API Configuration">
            ⚙️ API
          </button>
        </div>

      </nav>

      {/* --- DASHBOARD ACTIONS (Add Card / Presets) --- */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-actions-bar">
          <div className="dashboard-controls-left">
            {/* ADD CARD BUTTON */}
            <div className="add-card-container">
              {/* 1. UPDATED ADD CARD BUTTON */}
              <div className="add-card-container">
                <button
                  className="add-card-btn"
                  onClick={() => setAddCardModalOpen(true)} // Open the new modal
                >
                  Add Widget
                </button>
              </div>
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

      {isAutoRefreshEnabled && <div className="auto-refresh-indicator"><div className="refresh-pulse"></div>Auto-refreshing...</div>}

      <div className='footer-spacer'></div>
      <Footer />

      {/* --- MODALS (Placed at Root Level to fix Z-Index issues) --- */}
      {editingCardId && (
        <ColonySummarySettingsModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          settings={cardSettings[editingCardId] || {
            showColonists: true,
            showAnimals: true,
            showItems: true,
            showWealth: true
          }}
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
        currentOverlay={backgroundOverlay}
        onSave={handleSaveSettings}
      />

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setAddCardModalOpen(false)}
        onAdd={onAddItem}
        availableCards={CARD_DEFINITIONS}
      />
    </div>
  );
};

export default RimWorldDashboard;