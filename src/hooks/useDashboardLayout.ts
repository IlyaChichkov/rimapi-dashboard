import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import { useToast } from '../components/ToastContext';
import { DashboardPreset, CardSettings } from '../types/dashboardTypes';
import { ColonySummarySettings } from '../components/ColonySummary';

const INITIAL_LAYOUT: Layout = [
  { i: 'colonists', x: 0, y: 0, w: 6, h: 2, isBounded: true },
  { i: 'resources', x: 8, y: 0, w: 6, h: 2, isBounded: true },
  { i: 'power', x: 0, y: 8, w: 4, h: 2, isBounded: true },
  { i: 'population', x: 4, y: 2, w: 4, h: 2, isBounded: true },
  { i: 'colonySummary', x: 8, y: 2, w: 4, h: 2, isBounded: true },
];

export const useDashboardLayout = () => {
  const { addToast } = useToast();
  
  // -- State --
  const [layout, setLayout] = useState<Layout>(INITIAL_LAYOUT);
  const [cardSettings, setCardSettings] = useState<CardSettings>({});
  
  // NEW: State to hold the background image of the currently loaded preset
  const [presetBgImage, setPresetBgImage] = useState<string | null>(null);
  
  const [presets, setPresets] = useState<DashboardPreset[]>(() => {
    const saved = localStorage.getItem('dashboard_presets');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const last = localStorage.getItem('last_selected_preset') || "";
    const saved = localStorage.getItem('dashboard_presets');
    if (last && saved) {
      const parsed = JSON.parse(saved);
      return parsed.some((p: any) => p.name === last) ? last : "";
    }
    return "";
  });

  const presetChangeRef = useRef(false);

  // -- Effects --
  
  // Load preset when selection changes
  useEffect(() => {
    if (selectedPreset && presets.length > 0) {
      const preset = presets.find(p => p.name === selectedPreset);
      if (preset) {
        presetChangeRef.current = true;
        setLayout(preset.layout);
        setCardSettings(preset.cardSettings || {});
        setPresetBgImage(preset.backgroundImage || null);
      }
    }
  }, [selectedPreset, presets]);

  // -- Actions --

  const handleCardSettingsChange = (cardId: string, newSettings: any) => {
    setCardSettings(prev => ({ ...prev, [cardId]: newSettings }));
  };

  const handleLayoutChange = (newLayout: Layout) => {
    if (presetChangeRef.current) {
      presetChangeRef.current = false;
      return;
    }
    
    const bounded = newLayout.map(item => ({ ...item, isBounded: true }));
    setLayout(bounded);
    
    // Auto-save logic (only updates layout, preserves existing BG)
    if (selectedPreset) {
       const currentPreset = presets.find(p => p.name === selectedPreset);
       const currentBg = currentPreset?.backgroundImage; // Preserve existing BG
       updatePresetInStorage(selectedPreset, bounded, cardSettings, currentBg);
    }
  };

  // UPDATED: Now accepts optional bgImage
  const updatePresetInStorage = (name: string, newLayout: Layout, newSettings: CardSettings, bgImage?: string) => {
     const updatedPresets = presets.map(p => 
        p.name === name ? { 
          ...p, 
          layout: newLayout, 
          cardSettings: newSettings,
          backgroundImage: bgImage !== undefined ? bgImage : p.backgroundImage 
        } : p
     );
     setPresets(updatedPresets);
     localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
  };

  const onAddItem = (itemId: string) => {
    const newItemId = `${itemId}_${new Date().getTime()}`;
    const newItem = { i: newItemId, x: 0, y: Infinity, w: 4, h: 2 };

    if (itemId === 'colonist') handleCardSettingsChange(newItemId, { colonistId: 0 });
    if (itemId === 'colonySummary') handleCardSettingsChange(newItemId, { showColonists: true, showAnimals: true, showItems: true, showWealth: true } as ColonySummarySettings);

    const newLayout = [...layout, newItem];
    setLayout(newLayout);
    
    if (selectedPreset) {
      const currentPreset = presets.find(p => p.name === selectedPreset);
      updatePresetInStorage(selectedPreset, newLayout, cardSettings, currentPreset?.backgroundImage);
    }
  };

  const onRemoveItem = (itemId: string) => {
    const newLayout = layout.filter(item => item.i !== itemId);
    setLayout(newLayout);
    if (selectedPreset) {
       const currentPreset = presets.find(p => p.name === selectedPreset);
       updatePresetInStorage(selectedPreset, newLayout, cardSettings, currentPreset?.backgroundImage);
       addToast({ type: 'info', title: 'Item removed', duration: 1500 });
    }
  };

  // UPDATED: Now accepts currentBackgroundImage
  const savePreset = (name: string, currentBackgroundImage?: string) => {
    if (!name) return false;
    
    const newPreset: DashboardPreset = { 
      name, 
      layout, 
      cardSettings,
      backgroundImage: currentBackgroundImage
    };
    
    const updated = [...presets.filter(p => p.name !== name), newPreset];
    
    setPresets(updated);
    localStorage.setItem('dashboard_presets', JSON.stringify(updated));
    setSelectedPreset(name);
    localStorage.setItem('last_selected_preset', name);
    return true;
  };

  const deletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    setPresets(updated);
    localStorage.setItem('dashboard_presets', JSON.stringify(updated));
    if (selectedPreset === name) setSelectedPreset("");
  };

  return {
    layout,
    cardSettings,
    presets,
    selectedPreset,
    presetBgImage, // Export this so the main component can listen to it
    handleLayoutChange,
    handleCardSettingsChange,
    onAddItem,
    onRemoveItem,
    savePreset,
    deletePreset,
    setSelectedPreset
  };
};