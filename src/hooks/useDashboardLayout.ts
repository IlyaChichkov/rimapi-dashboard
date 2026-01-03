import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import { useToast } from '../components/ToastContext'; // Adjust path if needed
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
  
  const [presets, setPresets] = useState<DashboardPreset[]>(() => {
    const saved = localStorage.getItem('dashboard_presets');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const last = localStorage.getItem('last_selected_preset') || "";
    // Verify validity
    const saved = localStorage.getItem('dashboard_presets');
    if (last && saved) {
      const parsed = JSON.parse(saved);
      return parsed.some((p: any) => p.name === last) ? last : "";
    }
    return "";
  });

  // -- Refs for avoiding loops --
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
      }
    }
  }, [selectedPreset, presets]);

  // -- Actions --

  const handleCardSettingsChange = (cardId: string, newSettings: any) => {
    setCardSettings(prev => {
      const updated = { ...prev, [cardId]: newSettings };
      // Debounced save logic would happen here in a real implementation
      // For now we rely on the user manually saving preset or auto-save hooks
      return updated;
    });
  };

  const handleLayoutChange = (newLayout: Layout) => {
    if (presetChangeRef.current) {
      presetChangeRef.current = false;
      return;
    }
    
    // Ensure bounded
    const bounded = newLayout.map(item => ({ ...item, isBounded: true }));
    setLayout(bounded);
    
    // Here you would trigger auto-save if required
    if (selectedPreset) {
       updatePresetInStorage(selectedPreset, bounded, cardSettings);
    }
  };

  const updatePresetInStorage = (name: string, newLayout: Layout, newSettings: CardSettings) => {
     const updatedPresets = presets.map(p => 
        p.name === name ? { ...p, layout: newLayout, cardSettings: newSettings } : p
     );
     setPresets(updatedPresets);
     localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
  };

  const onAddItem = (itemId: string) => {
    const newItemId = `${itemId}_${new Date().getTime()}`;
    const newItem = {
      i: newItemId, x: (layout.length * 4) % 12, y: Infinity, w: 4, h: 2
    };

    // Default settings init
    if (itemId === 'colonist') handleCardSettingsChange(newItemId, { colonistId: 0 });
    if (itemId === 'colonySummary') handleCardSettingsChange(newItemId, { showColonists: true, showAnimals: true, showItems: true, showWealth: true } as ColonySummarySettings);

    const newLayout = [...layout, newItem];
    setLayout(newLayout);
    
    if (selectedPreset) {
      updatePresetInStorage(selectedPreset, newLayout, cardSettings);
    }
  };

  const onRemoveItem = (itemId: string) => {
    const newLayout = layout.filter(item => item.i !== itemId);
    setLayout(newLayout);
    if (selectedPreset) {
       updatePresetInStorage(selectedPreset, newLayout, cardSettings);
       addToast({ type: 'info', title: 'Item removed', duration: 1500 });
    }
  };

  const savePreset = (name: string) => {
    if (!name) return false;
    const newPreset = { name, layout, cardSettings };
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
    handleLayoutChange,
    handleCardSettingsChange,
    onAddItem,
    onRemoveItem,
    savePreset,
    deletePreset,
    setSelectedPreset
  };
};