import React from 'react';
import './ColonySummarySettingsModal.css';
import { ColonySummarySettings } from '@/components/widgets/ColonySummary';

interface ColonySummarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ColonySummarySettings;
  onSettingsChange: (settings: ColonySummarySettings) => void;
}

const ColonySummarySettingsModal: React.FC<ColonySummarySettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) {
    return null;
  }

  const handleSettingChange = (setting: keyof ColonySummarySettings) => {
    onSettingsChange({
      ...settings,
      [setting]: !settings[setting],
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Colony Summary Settings</h2>
          <button onClick={onClose} className="close-modal-btn">&times;</button>
        </div>
        <div className="settings-options">
          <label>
            <input
              type="checkbox"
              checked={settings.showColonists}
              onChange={() => handleSettingChange('showColonists')}
            />
            Show Colonists
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showAnimals}
              onChange={() => handleSettingChange('showAnimals')}
            />
            Show Animals
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showItems}
              onChange={() => handleSettingChange('showItems')}
            />
            Show Total Items
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.showWealth}
              onChange={() => handleSettingChange('showWealth')}
            />
            Show Wealth
          </label>
        </div>
      </div>
    </div>
  );
};

export default ColonySummarySettingsModal;
