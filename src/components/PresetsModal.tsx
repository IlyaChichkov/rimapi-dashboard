// src/components/PresetsModal.tsx
import React, { useState } from 'react';
import './PresetsModal.css';
import { DashboardPreset } from '../types/dashboardTypes';

interface PresetsModalProps {
    isOpen: boolean;
    onClose: () => void;
    presets: DashboardPreset[];
    selectedPreset: string;
    onSave: (name: string) => void;
    onSelect: (name: string) => void;
    onDelete: (name: string) => void;
}

const PresetsModal: React.FC<PresetsModalProps> = ({
    isOpen, onClose, presets, selectedPreset, onSave, onSelect, onDelete
}) => {
    const [newPresetName, setNewPresetName] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (newPresetName.trim()) {
            onSave(newPresetName);
            setNewPresetName(''); // Reset input
        }
    };

    const handleUpdateCurrent = () => {
        if (selectedPreset) {
            onSave(selectedPreset);
        }
    };

    return (
        <div className="presets-modal-overlay" onClick={onClose}>
            <div className="presets-modal-content" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="presets-modal-header">
                    <h2>Dashboard Presets</h2>
                    <button onClick={onClose} className="presets-close-btn">&times;</button>
                </div>

                <div className="presets-modal-body">

                    {/* Save Section */}
                    <div className="presets-save-section">
                        <h3>Save Current Layout</h3>
                        <div className="presets-input-group">
                            <input
                                type="text"
                                className="presets-name-input"
                                placeholder="New preset name..."
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                            <button
                                className="presets-save-btn"
                                onClick={handleSave}
                                disabled={!newPresetName.trim()}
                            >
                                Save New
                            </button>
                        </div>

                        {/* Quick Update Button if a preset is active */}
                        {selectedPreset && (
                            <button className="presets-update-btn" onClick={handleUpdateCurrent}>
                                ↻ Save "{selectedPreset}" current layout
                            </button>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="presets-list-section">
                        <h3>Saved Layouts</h3>
                        {presets.length === 0 ? (
                            <div className="presets-empty-state">No saved presets yet.</div>
                        ) : (
                            <div className="presets-list-container">
                                {presets.map((preset) => (
                                    <div
                                        key={preset.name}
                                        className={`preset-list-item ${selectedPreset === preset.name ? 'active' : ''}`}
                                    >
                                        <button
                                            className="preset-select-action"
                                            onClick={() => onSelect(preset.name)}
                                        >
                                            {selectedPreset === preset.name && <span>●</span>}
                                            {preset.name}
                                        </button>

                                        <button
                                            className="preset-delete-action"
                                            title="Delete preset"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent selection when deleting
                                                if (window.confirm(`Delete preset "${preset.name}"?`)) {
                                                    onDelete(preset.name);
                                                }
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PresetsModal;