// src/App.tsx
import React, { useState, useEffect } from 'react';
import RimWorldDashboard from './components/RimWorldDashboard';
import ApiConfig from './components/ApiConfig';
import './App.css';

function App() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if URL is saved in localStorage
    const savedUrl = localStorage.getItem('rimworldApiUrl');
    if (savedUrl) {
      setApiUrl(savedUrl);
      setIsConfigured(true);
    } else {
      // Set default URL but don't auto-connect
      setApiUrl('http://localhost:8765/api/v1');
    }
  }, []);

  const handleApiUrlChange = (url: string) => {
    setApiUrl(url);
    setIsConfigured(true);
  };

  const handleResetConfig = () => {
    localStorage.removeItem('rimworldApiUrl');
    setIsConfigured(false);
  };

  return (
    <div className="App">
      {!isConfigured ? (
        <ApiConfig onApiUrlChange={handleApiUrlChange} currentUrl={apiUrl} />
      ) : (
        <RimWorldDashboard 
          apiUrl={apiUrl} 
          onResetConfig={handleResetConfig} 
        />
      )}
    </div>
  );
}

export default App;