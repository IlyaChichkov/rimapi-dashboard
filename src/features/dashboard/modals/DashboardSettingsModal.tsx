// src/components/DashboardSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import './DashboardSettingsModal.css';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBgUrl: string;
    currentBlur: number;
    defaultBgUrl: string;
    onSave: (url: string, blur: number) => void;
}

const BG_PRESETS = [
    { name: 'Cyberpunk City', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Cyberpunk/Loader/BGLoader%406.jpg' },
    { name: 'Cyberpunk Lab', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Cyberpunk/Loader/BGLoader.jpg' },
    { name: 'Muffalo', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Muffalo/Loader/BGLoader.jpg' },
    { name: 'Thrumbo 3', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Thrumbo/Loader/BGLoader%403.jpg' },
    { name: 'Thrumbo 5', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Thrumbo/Loader/BGLoader%405.jpg' },
    { name: 'USFM', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/USFM/Loader/BGLoader.jpg' },
    { name: 'Classic Cassandra', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Classic%20Cassandra/Loader/BGLoader.jpg' },
    { name: 'Centipede', url: 'https://raw.githubusercontent.com/aRandomKiwi/RimThemes/main/Themes/Centipede/Loader/BGLoader%401.jpg' },
];

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
    isOpen, onClose, currentBgUrl, currentBlur, defaultBgUrl, onSave
}) => {
    const [bgUrl, setBgUrl] = useState(currentBgUrl);
    const [blur, setBlur] = useState(currentBlur);

    useEffect(() => {
        setBgUrl(currentBgUrl);
        setBlur(currentBlur);
    }, [currentBgUrl]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(bgUrl, blur);
        onClose();
    };

    const handleReset = () => {
        setBgUrl(defaultBgUrl);
        setBlur(0);
        onSave(defaultBgUrl, blur);
    };

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>Dashboard Settings</h2>
                    <button onClick={onClose} className="settings-close-btn">&times;</button>
                </div>

                <div className="settings-modal-body">

                    {/* --- GALLERY SECTION --- */}
                    <div className="settings-section">
                        <h3>Gallery</h3>
                        <div className="settings-gallery-grid">
                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.url}
                                    className={`gallery-item ${bgUrl === preset.url ? 'active' : ''}`}
                                    onClick={() => setBgUrl(preset.url)}
                                    title={preset.name}
                                >
                                    <img src={preset.url} alt={preset.name} loading="lazy" />
                                    <span className="gallery-label">{preset.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* --- CREDITS --- */}
                        <p className="settings-hint credits">
                            Backgrounds from <a href="https://github.com/aRandomKiwi/RimThemes" target="_blank" rel="noopener noreferrer">RimThemes</a> repo, author: aRandomKiwi.
                        </p>
                    </div>

                    <div className="settings-divider"></div>

                    {/* --- CUSTOM URL SECTION --- */}
                    <div className="settings-section">
                        <h3>Custom URL</h3>
                        <p className="settings-hint">Or paste a custom image URL:</p>

                        <div className="settings-input-group">
                            <input
                                type="text"
                                className="settings-input"
                                placeholder="https://example.com/image.jpg"
                                value={bgUrl}
                                onChange={(e) => setBgUrl(e.target.value)}
                            />
                        </div>

                        <div className="settings-preview">
                            <label>Current Preview:</label>
                            <div
                                className="bg-preview-box"
                                style={{ backgroundImage: `url(${bgUrl})` }}
                            />
                        </div>
                    </div>
                    {/* BLUR SLIDER */}
                    <div className="settings-slider-group">
                        <div className="slider-header">
                            <label className="settings-label">Background Blur</label>
                            <span className="slider-value">{blur}px</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={blur}
                            onChange={(e) => setBlur(parseInt(e.target.value))}
                            className="settings-slider"
                        />
                    </div>

                    <div className="settings-actions">
                        <button className="settings-btn secondary" onClick={handleReset}>
                            Reset to Default
                        </button>
                        <button className="settings-btn primary" onClick={handleSave}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSettingsModal;