import React, { useState, useRef, useEffect } from 'react';
import type { Layout } from 'react-grid-layout';
import './PresetsContextMenu.css';

interface PresetsContextMenuProps {
    presets: { name: string, layout: Layout }[];
    selectedPreset: string;
    onSave: (name: string) => boolean;
    onSelect: (name: string) => void;
    onDelete: (name: string) => void;
    onClose: () => void;
}

const PresetsContextMenu: React.FC<PresetsContextMenuProps> = ({
    presets,
    selectedPreset,
    onSave,
    onSelect,
    onDelete,
    onClose,
}) => {
    const [newPresetName, setNewPresetName] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const handleCreate = () => {
        if (presets.some(p => p.name === newPresetName)) {
            if (window.confirm(`Preset "${newPresetName}" already exists. Overwrite?`)) {
                if (onSave(newPresetName)) {
                    setNewPresetName('');
                    onClose();
                }
            }
        } else {
            if (onSave(newPresetName)) {
                setNewPresetName('');
                onClose();
            }
        }
    };

    const handleSelect = (name: string) => {
        onSelect(name);
        onClose();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div className="presets-context-menu" ref={menuRef}>
            <div className="create-preset-section">
                <input
                    type="text"
                    placeholder="New preset name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="preset-name-input"
                />
                <button onClick={handleCreate} className="create-preset-btn">Create</button>
            </div>
            <ul className="presets-list">
                {presets.map(preset => (
                    <li
                        key={preset.name}
                        className={`preset-item ${preset.name === selectedPreset ? 'selected' : ''}`}
                    >
                        <span className="preset-name" onClick={() => handleSelect(preset.name)}>
                            {preset.name}
                        </span>
                        <button
                            onClick={() => onDelete(preset.name)}
                            className="delete-preset-btn"
                        >
                            🗑️
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PresetsContextMenu;
