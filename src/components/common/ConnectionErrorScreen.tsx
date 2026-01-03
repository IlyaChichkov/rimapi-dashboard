// src/components/ConnectionErrorScreen.tsx
import React from 'react';
import './ConnectionErrorScreen.css';

interface ConnectionErrorScreenProps {
  error?: string;
  apiUrl?: string;
  onRetry: () => void;
  onChangeUrl: () => void;
}

const ConnectionErrorScreen: React.FC<ConnectionErrorScreenProps> = ({
  error = "Failed to connect to RimWorld API",
  apiUrl,
  onRetry,
  onChangeUrl
}) => {
  return (
    <div className="connection-error-screen">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Connection Failed</h2>
        <p className="error-message">{error}</p>

        {apiUrl && (
          <div className="connection-details">
            <div className="detail-item">
              <span className="detail-label">Attempted URL:</span>
              <span className="detail-value">{apiUrl}</span>
            </div>
          </div>
        )}

        <div className="troubleshooting">
          <h4>Possible Solutions:</h4>
          <ul>
            <li>Ensure RimWorld is running with RIMAPI mod enabled</li>
            <li>Verify the API URL is correct</li>
            <li>Check if your firewall is blocking the connection</li>
            <li>Make sure RIMAPI is configured with CORS headers</li>
          </ul>
        </div>

        <div className="error-actions">
          <button onClick={onRetry} className="retry-btn">
            🔄 Retry Connection
          </button>
          <button onClick={onChangeUrl} className="change-url-btn">
            🔧 Change API URL
          </button>
        </div>


        <div className="error-actions">
          <a
            href="https://github.com/IlyaChichkov/rimapi-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            title="View on GitHub"
          >
            <span className="link-icon">🐙</span>
            <span className="link-text">GitHub</span>
          </a>

          <a
            href="https://discord.gg/rimworld"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            title="Join RimWorld Discord"
          >
            <span className="link-icon">💬</span>
            <span className="link-text">Discord</span>
          </a></div>
      </div>
    </div>
  );
};

export default ConnectionErrorScreen;