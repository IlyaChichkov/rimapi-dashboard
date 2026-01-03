// src/components/Footer.tsx
import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span className="copyright">
            © {currentYear} RimWorld Colony Dashboard
          </span>
          <span className="disclaimer">
            This is a fan-made project and is not officially affiliated with Ludeon Studios.
            RimWorld is a trademark of Ludeon Studios.
          </span>
        </div>
        
        <div className="footer-right">
          <div className="footer-links">
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
            </a>
            
            <a 
              href="https://rimworldgame.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
              title="Official RimWorld Website"
            >
              <span className="link-icon">🎮</span>
              <span className="link-text">RimWorld</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;