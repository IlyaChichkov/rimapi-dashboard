// src/components/ApiConfig.tsx
import React, { useState } from 'react';
import './ApiConfig.css';

const TESTED_MOD_VERSION = "1.6.1";


interface ApiConfigProps {
  onApiUrlChange: (url: string) => void;
  currentUrl: string;
  onResetConfig?: () => void;
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onApiUrlChange, currentUrl, onResetConfig }) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isValid, setIsValid] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const testConnection = async (url: string): Promise<boolean> => {
    try {
      setIsTesting(true);
      const testUrl = `${url}/game/state?_=${Date.now()}`;
      const response = await fetch(testUrl, {
        cache: 'no-cache',
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = new URL(inputUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        const isConnected = await testConnection(inputUrl);
        if (isConnected) {
          onApiUrlChange(inputUrl);
          setIsValid(true);
          localStorage.setItem('rimworldApiUrl', inputUrl);
        } else {
          setIsValid(false);
        }
      } else {
        setIsValid(false);
      }
    } catch {
      setIsValid(false);
    }
  };

  const handleUseDefault = async () => {
    const defaultUrl = 'http://localhost:8765/api/v1';
    setInputUrl(defaultUrl);

    const isConnected = await testConnection(defaultUrl);
    if (isConnected) {
      onApiUrlChange(defaultUrl);
      setIsValid(true);
      localStorage.setItem('rimworldApiUrl', defaultUrl);
    } else {
      setIsValid(false);
    }
  };

  const handleQuickConnect = (url: string) => {
    setInputUrl(url);
  };

  return (
    <div className="api-config-screen">
      <div className="ac-content">

        {/* Header Section */}
        <div className="ac-header">
          <div className="ac-icon">📡</div>
          <h1 className="ac-title">RimWorld Dashboard</h1>
          <p className="ac-subtitle">Connect to your local colony</p>
        </div>

        <form onSubmit={handleSubmit} className="ac-form">

          {/* URL Input */}
          <div className="ac-input-group">
            <label htmlFor="api-url" className="ac-label">Server URL</label>
            <input
              id="api-url"
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setIsValid(true);
              }}
              placeholder="http://localhost:8765/api/v1"
              className={`ac-input ${!isValid ? 'ac-input-error' : ''}`}
              disabled={isTesting}
            />
            {!isValid && (
              <div className="ac-error-message">
                ❌ Connection failed. Ensure RimWorld is running with RIMAPI.
              </div>
            )}
          </div>

          {/* Version Info (Read-Only) */}
          <div className="ac-info-row">
            <span className="ac-info-label">Dashboard Compatibility:</span>
            <span className="ac-version-badge">Tested with RimAPI v{TESTED_MOD_VERSION}</span>
          </div>

          {/* Quick Connect Buttons */}
          <div className="ac-quick-connect">
            <span className="ac-quick-label">Presets:</span>
            <div className="ac-quick-buttons">
              <button type="button" onClick={() => handleQuickConnect('http://localhost:8765/api/v1')} className="ac-quick-btn">
                Localhost
              </button>
              <button type="button" onClick={() => handleQuickConnect('http://127.0.0.1:8765/api/v1')} className="ac-quick-btn">
                127.0.0.1
              </button>
            </div>
          </div>

          {/* Main Actions */}
          <div className="ac-action-buttons">
            <button type="submit" className="ac-btn ac-btn-primary" disabled={isTesting}>
              {isTesting ? 'Connecting...' : 'Connect'}
            </button>
            <button type="button" onClick={handleUseDefault} className="ac-btn ac-btn-secondary" disabled={isTesting}>
              Default
            </button>
          </div>
        </form>

        {/* Setup Guide with Link */}
        <div className="ac-setup-guide">
          <h3 className="ac-guide-title">Setup Instructions</h3>
          <div className="ac-guide-steps">
            <div className="ac-step">
              <span className="ac-step-num">1</span>
              <div className="ac-step-content">
                <p>Download <strong>RIMAPI</strong> mod from GitHub.</p>
                <a
                  href="https://github.com/IlyaChichkov/RIMAPI/tags"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ac-mod-link"
                >
                  📦 View Latest Releases
                </a>
              </div>
            </div>
            <div className="ac-step">
              <span className="ac-step-num">2</span>
              <p>Enable mod in RimWorld & Start a save.</p>
            </div>
            <div className="ac-step">
              <span className="ac-step-num">3</span>
              <p>Enter the URL above (default is usually correct).</p>
            </div>
          </div>
        </div>

        <div className="ac-footer">
          <span className="ac-footer-text">Need help or want to chat?</span>
          <a
            href="https://discord.gg/Css9b9BgnM"
            target="_blank"
            rel="noopener noreferrer"
            className="ac-discord-link"
          >
            <span className="discord-icon">👾</span> Join our Discord
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiConfig;