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
    onRename: (oldName: string, newName: string) => boolean; // Updated Prop
}

const PresetsModal: React.FC<PresetsModalProps> = ({
    isOpen, onClose, presets, selectedPreset, onSave, onSelect, onDelete, onRename
}) => {
    const [newPresetName, setNewPresetName] = useState('');

    // State for renaming
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    // --- SAVE NEW HANDLER ---
    const handleSave = () => {
        if (!newPresetName.trim()) return;

        if (presets.some(p => p.name.toLowerCase() === newPresetName.trim().toLowerCase())) {
            setErrorMsg(`Preset "${newPresetName}" already exists.`);
            return;
        }

        onSave(newPresetName);
        setNewPresetName('');
        setErrorMsg(null);
    };

    // --- RENAME HANDLERS ---
    const startEditing = (name: string) => {
        setEditingId(name);
        setEditName(name);
        setErrorMsg(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
        setErrorMsg(null);
    };

    const saveRename = (oldName: string) => {
        if (!editName.trim()) return;

        const success = onRename(oldName, editName.trim());

        if (success) {
            setEditingId(null);
            setErrorMsg(null);
        } else {
            setErrorMsg("Name already exists or is invalid.");
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

                <div className="presets-modal-header">
                    <h2>Dashboard Presets</h2>
                    <button onClick={onClose} className="presets-close-btn">&times;</button>
                </div>

                <div className="presets-modal-body">

                    {/* Error Banner */}
                    {errorMsg && <div className="preset-error-banner">{errorMsg}</div>}

                    {/* Save Section */}
                    <div className="presets-save-section">
                        <h3>Save Current Layout</h3>
                        <div className="presets-input-group">
                            <input
                                type="text"
                                className="presets-name-input"
                                placeholder="New preset name..."
                                value={newPresetName}
                                onChange={(e) => {
                                    setNewPresetName(e.target.value);
                                    if (errorMsg) setErrorMsg(null);
                                }}
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

                        {selectedPreset && (
                            <button className="presets-update-btn" onClick={handleUpdateCurrent}>
                                ↻ Update "{selectedPreset}" with current layout
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
                                        {/* RENDER MODE: EDITING vs VIEWING */}
                                        {editingId === preset.name ? (
                                            <div className="preset-edit-mode">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="preset-edit-input"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRename(preset.name);
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                />
                                                <div className="preset-edit-actions">
                                                    <button onClick={() => saveRename(preset.name)} className="edit-confirm-btn">✓</button>
                                                    <button onClick={cancelEditing} className="edit-cancel-btn">✕</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    className="preset-select-action"
                                                    onClick={() => onSelect(preset.name)}
                                                >
                                                    {selectedPreset === preset.name && <span className="preset-dot">●</span>}
                                                    {preset.name}
                                                </button>

                                                <div className="preset-item-controls">
                                                    <button
                                                        className="preset-icon-btn rename"
                                                        title="Rename"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(preset.name);
                                                        }}
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="preset-icon-btn delete"
                                                        title="Delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Delete preset "${preset.name}"?`)) {
                                                                onDelete(preset.name);
                                                            }
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </>
                                        )}
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