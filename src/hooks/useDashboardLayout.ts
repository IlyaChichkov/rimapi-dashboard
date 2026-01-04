import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from 'react-grid-layout';
import { useToast } from '../components/feedback/ToastContext';
import { DashboardPreset, CardSettings } from '../types/dashboardTypes';
import { ColonySummarySettings } from '../components/widgets/ColonySummary';

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
  
  // Background State for the *Loaded* preset
  const [presetBgImage, setPresetBgImage] = useState<string | null>(null);
  const [presetBgBlur, setPresetBgBlur] = useState<number>(0);
  
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
      localStorage.setItem('last_selected_preset', selectedPreset);

      const preset = presets.find(p => p.name === selectedPreset);
      if (preset) {
        presetChangeRef.current = true;
        setLayout(preset.layout);
        setCardSettings(preset.cardSettings || {});
        
        // Load Background & Blur (Force null/0 if missing to clear previous state)
        setPresetBgImage(preset.backgroundImage || null);
        setPresetBgBlur(preset.backgroundBlur || 0);
      }
    }
  }, [selectedPreset, presets]);

  // -- Actions --

  const handleCardSettingsChange = (cardId: string, newSettings: any) => {
    setCardSettings(prev => ({ ...prev, [cardId]: newSettings }));
  };

  // Helper to persist updates to localStorage
  const updatePresetInStorage = (
    name: string, 
    newLayout: Layout, 
    newSettings: CardSettings, 
    bgImage?: string,
    bgBlur?: number
  ) => {
     const updatedPresets = presets.map(p => 
        p.name === name ? { 
          ...p, 
          layout: newLayout, 
          cardSettings: newSettings,
          // IMPORTANT: If bgImage is undefined, keep the existing p.backgroundImage
          backgroundImage: bgImage !== undefined ? bgImage : p.backgroundImage,
          backgroundBlur: bgBlur !== undefined ? bgBlur : p.backgroundBlur
        } : p
     );
     setPresets(updatedPresets);
     localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));
  };

  const handleLayoutChange = (newLayout: Layout) => {
    if (presetChangeRef.current) {
      presetChangeRef.current = false;
      return;
    }
    
    const bounded = newLayout.map(item => ({ ...item, isBounded: true }));
    setLayout(bounded);
    
    // Auto-save Layout Changes (Preserve existing BG)
    if (selectedPreset) {
       const currentPreset = presets.find(p => p.name === selectedPreset);
       // We pass undefined for BG so updatePresetInStorage keeps the old one
       updatePresetInStorage(selectedPreset, bounded, cardSettings); 
    }
  };

  const onAddItem = (itemId: string) => {
    const newItemId = `${itemId}_${new Date().getTime()}`;
    const newItem = { i: newItemId, x: 0, y: Infinity, w: 4, h: 2 };

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

    const newCardSettings = { ...cardSettings };
    
    if (newCardSettings[itemId]) {
        delete newCardSettings[itemId];
        setCardSettings(newCardSettings);
    }

    if (selectedPreset) {
       updatePresetInStorage(selectedPreset, newLayout, newCardSettings);
       addToast({ type: 'info', title: 'Item removed', duration: 1500 });
    }
  };

  // Manual Save (Overwrites everything including BG)
  const savePreset = (name: string, currentBackgroundImage?: string, currentBackgroundBlur?: number) => {
    if (!name) return false;
    
    const newPreset: DashboardPreset = { 
      name, 
      layout, 
      cardSettings,
      // Save the passed background/blur
      backgroundImage: currentBackgroundImage,
      backgroundBlur: currentBackgroundBlur 
    };
    
    // Replace if exists, or append if new
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

  const renamePreset = (oldName: string, newName: string) => {
    // Basic Validation
    if (!newName.trim() || newName === oldName) return false;
    
    // Check if name already exists
    if (presets.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
      return false; 
    }

    const updatedPresets = presets.map(p => 
      p.name === oldName ? { ...p, name: newName } : p
    );

    setPresets(updatedPresets);
    localStorage.setItem('dashboard_presets', JSON.stringify(updatedPresets));

    // If the renamed preset was the active one, update selection state
    if (selectedPreset === oldName) {
      setSelectedPreset(newName);
      localStorage.setItem('last_selected_preset', newName);
    }
    
    return true;
  };

  const exportPresets = () => {
    return JSON.stringify(presets, null, 2);
  };

  const importPresets = (jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      
      // Basic validation: ensure it's an array and items look like presets
      if (!Array.isArray(imported)) return false;
      const isValid = imported.every((p: any) => p.name && Array.isArray(p.layout));
      
      if (!isValid) return false;

      // Option A: Overwrite everything
      // setPresets(imported);
      // localStorage.setItem('dashboard_presets', JSON.stringify(imported));

      // Option B: Merge (Avoid duplicates by checking names)
      // This keeps existing presets unless the imported one has the same name, then it overwrites.
      const merged = [...presets];
      imported.forEach((newP: DashboardPreset) => {
        const index = merged.findIndex(p => p.name === newP.name);
        if (index >= 0) {
          merged[index] = newP; // Overwrite existing
        } else {
          merged.push(newP); // Add new
        }
      });

      setPresets(merged);
      localStorage.setItem('dashboard_presets', JSON.stringify(merged));
      return true;
    } catch (e) {
      console.error("Failed to parse presets", e);
      return false;
    }
  };

  return {
    layout,
    cardSettings,
    presets,
    selectedPreset,
    presetBgImage,
    presetBgBlur,
    handleLayoutChange,
    handleCardSettingsChange,
    onAddItem,
    onRemoveItem,
    savePreset,
    deletePreset,
    setSelectedPreset,
    renamePreset,
    exportPresets,
    importPresets,
  };
};