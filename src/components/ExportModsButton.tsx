// src/components/ExportModsButton.tsx
import React from 'react';
import { ModInfo } from '../types';
import './ExportModsButton.css';

interface ExportModsButtonProps {
  modsInfo: ModInfo[];
  disabled?: boolean;
}

const ExportModsButton: React.FC<ExportModsButtonProps> = ({ 
  modsInfo, 
  disabled = false 
}) => {
  const generateModsConfigXML = (): string => {
    // Sort mods by load order for the XML output
    const sortedMods = [...modsInfo].sort((a, b) => a.load_order - b.load_order);
    
    // Get active mods (excluding core game and DLCs if needed)
    const activeMods = sortedMods.map(mod => mod.package_id);
    
    // Core game mods that should be in knownExpansions
    const knownExpansions = [
      'ludeon.rimworld',
      'ludeon.rimworld.royalty',
      'ludeon.rimworld.ideology', 
      'ludeon.rimworld.biotech',
      'ludeon.rimworld.anomaly'
    ];
    
    // Filter knownExpansions to only include those present in active mods
    const presentExpansions = knownExpansions.filter(expansion => 
      activeMods.includes(expansion)
    );

    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<ModsConfigData>
    <version>1.5.4104 rev415</version>
    <activeMods>
${activeMods.map(modId => `        <li>${modId}</li>`).join('\n')}
    </activeMods>
    <knownExpansions>
${presentExpansions.map(expansion => `        <li>${expansion}</li>`).join('\n')}
    </knownExpansions>
</ModsConfigData>`;

    return xmlContent;
  };

  const handleExport = () => {
    const xmlContent = generateModsConfigXML();
    
    // Create blob and download link
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = 'ModsConfig.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="export-mods-button"
      onClick={handleExport}
      disabled={disabled || modsInfo.length === 0}
      title="Export ModsConfig.xml"
    >
      <span className="export-icon">📤</span>
      <span className="export-text">Export ModsConfig.xml</span>
    </button>
  );
};

export default ExportModsButton;