import React, { useState, useEffect } from 'react';
import './DashboardSettingsModal.css';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBgUrl: string;
    currentBlur: number;
    currentOverlay: number; // New Prop: -100 (Black) to 100 (White)
    defaultBgUrl: string;
    onSave: (url: string, blur: number, overlay: number) => void;
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
    isOpen, onClose, currentBgUrl, currentBlur, currentOverlay, defaultBgUrl, onSave
}) => {
    const [bgUrl, setBgUrl] = useState(currentBgUrl);
    const [blur, setBlur] = useState(currentBlur);
    const [overlay, setOverlay] = useState(currentOverlay || 0);

    useEffect(() => {
        setBgUrl(currentBgUrl);
        setBlur(currentBlur);
        setOverlay(currentOverlay || 0);
    }, [currentBgUrl, currentBlur, currentOverlay, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(bgUrl, blur, overlay);
        onClose();
    };

    const handleReset = () => {
        setBgUrl(defaultBgUrl);
        setBlur(0);
        setOverlay(0);
        onSave(defaultBgUrl, 0, 0);
    };

    // Helper to visualize overlay in the preview box
    const getPreviewStyle = () => {
        let overlayString = '';
        if (overlay !== 0) {
            const opacity = Math.abs(overlay) / 100;
            const color = overlay < 0 ? `rgba(0,0,0,${opacity})` : `rgba(255,255,255,${opacity})`;
            overlayString = `linear-gradient(${color}, ${color}), `;
        }
        return {
            backgroundImage: `${overlayString}url(${bgUrl})`,
            filter: `blur(${blur / 4}px)` // Reduced blur for small preview
        };
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
                    </div>

                    <div className="settings-divider"></div>

                    {/* --- CUSTOM URL SECTION --- */}
                    <div className="settings-section">
                        <h3>Custom URL</h3>
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
                            <label>Preview:</label>
                            <div className="bg-preview-box" style={getPreviewStyle()} />
                        </div>
                    </div>

                    <div className="settings-divider"></div>

                    {/* --- SLIDERS SECTION --- */}
                    <div className="settings-section">
                        <h3>Appearance</h3>

                        {/* BLUR SLIDER */}
                        <div className="settings-slider-group">
                            <div className="slider-header">
                                <label className="settings-label">Blur</label>
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

                        {/* OVERLAY SLIDER */}
                        <div className="settings-slider-group">
                            <div className="slider-header">
                                <label className="settings-label">Tint (Dark ↔ Light)</label>
                                <span className="slider-value">{overlay > 0 ? `+${overlay}` : overlay}%</span>
                            </div>
                            <div className="slider-container-dual">
                                <span className="slider-icon">🌑</span>
                                <input
                                    type="range"
                                    min="-90"
                                    max="90"
                                    step="5"
                                    value={overlay}
                                    onChange={(e) => setOverlay(parseInt(e.target.value))}
                                    className="settings-slider"
                                    style={{ margin: '0 10px' }}
                                />
                                <span className="slider-icon">☀️</span>
                            </div>
                            <p className="settings-hint" style={{ marginTop: '5px', fontSize: '0.8rem' }}>
                                Negative values darken the background, positive values lighten it.
                            </p>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button className="settings-btn secondary" onClick={handleReset}>
                            Reset
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