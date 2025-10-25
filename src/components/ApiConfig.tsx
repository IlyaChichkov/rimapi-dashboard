// src/components/ApiConfig.tsx
import React, { useState } from 'react';
import './ApiConfig.css';

interface ApiConfigProps {
  onApiUrlChange: (url: string) => void;
  currentUrl: string;
}

const ApiConfig: React.FC<ApiConfigProps> = ({ onApiUrlChange, currentUrl }) => {
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
    
    // Basic URL validation
    try {
      const url = new URL(inputUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        // Test the connection before proceeding
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
    
    // Test default connection
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
      <div className="api-config-content">
        <div className="config-header">
          <div className="config-icon">🎮</div>
          <h1 className="config-title">RimWorld Colony Dashboard</h1>
          <p className="config-subtitle">Connect to your RimWorld game</p>
        </div>

        <form onSubmit={handleSubmit} className="api-config-form">
          <div className="input-group">
            <label htmlFor="api-url" className="input-label">
              RIMAPI Server URL
            </label>
            <input
              id="api-url"
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setIsValid(true);
              }}
              placeholder="http://localhost:8765/api/v1"
              className={`url-input ${!isValid ? 'input-connect-error' : ''}`}
              disabled={isTesting}
            />
            {!isValid && (
              <div className="error-message">
                ❌ Unable to connect. Please check the URL and ensure RimWorld is running with RIMAPI mod.
              </div>
            )}
          </div>

          <div className="quick-connect">
            <span className="quick-connect-label">Quick Connect:</span>
            <div className="quick-buttons">
              <button 
                type="button" 
                onClick={() => handleQuickConnect('http://localhost:8765/api/v1')}
                className="quick-btn"
              >
                localhost:8765
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickConnect('http://127.0.0.1:8765/api/v1')}
                className="quick-btn"
              >
                127.0.0.1:8765
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              type="submit" 
              className="connect-btn"
              disabled={isTesting}
            >
              {isTesting ? (
                <>
                  <div className="button-spinner"></div>
                  Testing Connection...
                </>
              ) : (
                <>
                  Connect
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={handleUseDefault}
              className="default-btn"
              disabled={isTesting}
            >
              Use Default
            </button>
          </div>
        </form>

        <div className="setup-guide">
          <h3 className="guide-title">Setup Instructions</h3>
          <div className="guide-steps">
            <div className="step">
              <div className="step-content">
                <p className="step-title">1. Install RIMAPI Mod</p>
                <p>Download and enable the RIMAPI mod in your RimWorld game</p>
              </div>
            </div>
            <div className="step">
              <div className="step-content">
                <p className="step-title">2. Start RimWorld</p>
                <p>Launch RimWorld with the RIMAPI mod enabled</p>
              </div>
            </div>
            <div className="step">
              <div className="step-content">
                <p className="step-title">3. Enter API URL</p>
                <p>Use the default URL or your custom RIMAPI endpoint</p>
              </div>
            </div>
            <div className="step">
              <div className="step-content">
                <p className="step-title">4. Connect & Enjoy</p>
                <p>Monitor your colony in real-time!</p>
              </div>
            </div>
          </div>
        </div>

        <div className="config-tip">
          💡 <strong>Pro Tip:</strong> {getRandomConfigTip()}
        </div>
      </div>
    </div>
  );
};

// Fun RimWorld-themed configuration tips
const getRandomConfigTip = () => {
  const tips = [
    "Make sure your colonists are safe before checking the dashboard!",
    "A connected dashboard is happier than a colonist with fine meals!",
    "This dashboard works better than a skilled doctor in a medical emergency!",
    "Keep an eye on your power grid - it's more reliable than solar flares!",
    "Monitor moods closely, they change faster than the weather!",
    "A well-connected colony is a prosperous colony!",
    "Even the ancient ones would be impressed with this technology!",
    "Your colony stats are now safer than in a mountain base!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};

export default ApiConfig;