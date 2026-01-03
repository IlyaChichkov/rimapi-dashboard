// src/components/DashboardSettingsModal.tsx
import React, { useState, useEffect } from 'react';
import './DashboardSettingsModal.css';

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBgUrl: string;
    defaultBgUrl: string; // 1. Add this definition
    onSave: (url: string) => void;
}

const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
    isOpen, onClose, currentBgUrl, defaultBgUrl, onSave // 2. Destructure it here
}) => {
    const [bgUrl, setBgUrl] = useState(currentBgUrl);

    useEffect(() => {
        setBgUrl(currentBgUrl);
    }, [currentBgUrl]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(bgUrl);
        onClose();
    };

    const handleReset = () => {
        // 3. Use the prop instead of a hardcoded string
        setBgUrl(defaultBgUrl);
        onSave(defaultBgUrl);
    };

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* ... (Header) ... */}

                <div className="settings-modal-body">
                    <div className="settings-section">
                        <h3>Background Image</h3>
                        <p className="settings-hint">Enter a URL for an image (web URL or local path)</p>

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
                            <div
                                className="bg-preview-box"
                                style={{ backgroundImage: `url(${bgUrl})` }}
                            />
                            {/* Optional: Show path for debugging */}
                            <div style={{ fontSize: '0.7em', color: '#666', marginTop: '5px', wordBreak: 'break-all' }}>
                                Current Path: {bgUrl}
                            </div>
                        </div>
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