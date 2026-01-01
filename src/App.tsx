// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import RimWorldDashboard from './components/RimWorldDashboard';
import ApiConfig from './components/ApiConfig';
import StartGameScreen from './components/StartGameScreen';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
import { ToastContainer } from './components/ToastContainer';
import { ToastProvider } from './components/ToastContext';
import { ImageCacheProvider } from './components/ImageCacheContext';
import { sseService } from './services/sseService';
import { rimworldApi, setApiBaseUrl } from './services/rimworldApi';

type GameStatus = 'checking' | 'menu' | 'playing' | 'api_error';

function App() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('checking');

  useEffect(() => {
    const savedUrl = localStorage.getItem('rimworldApiUrl');
    if (savedUrl) {
      setApiUrl(savedUrl);
      setApiBaseUrl(savedUrl);
      sseService.setApiUrl(savedUrl);
      setIsConfigured(true);
    } else {
      setApiUrl('http://localhost:8765/api/v1');
      // If not configured, we will show ApiConfig right away
    }
  }, []);

  const checkGameState = useCallback(async () => {
    setGameStatus('checking');
    try {
      const state = await rimworldApi.fetchGameState();
      if (state) {
        if (state.program_state === 'Playing' && state.colonist_count > 0) {
          setGameStatus('playing');
        } else {
          setGameStatus('menu');
        }
      } else {
        setGameStatus('api_error');
      }
    } catch (error) {
      console.error("Error checking game state:", error);
      setGameStatus('api_error');
    }
  }, []);

  useEffect(() => {
    if (isConfigured) {
      checkGameState();
      sseService.connect();
    }
  }, [isConfigured, checkGameState]);

  const handleApiUrlChange = (url: string) => {
    localStorage.setItem('rimworldApiUrl', url);
    setApiUrl(url);
    setApiBaseUrl(url);
    sseService.setApiUrl(url);
    setIsConfigured(true);
    setGameStatus('checking'); // Re-check game state after URL change
  };

  const handleResetConfig = () => {
    localStorage.removeItem('rimworldApiUrl');
    setIsConfigured(false);
  };

  const handleStartGame = async () => {
    try {
      await rimworldApi.startGame();
      setTimeout(checkGameState, 5000); // Give game time to start, then re-check
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  const handleLoadGame = async (saveName: string) => {
    if (!saveName) return;
    try {
      await rimworldApi.loadGame(saveName);
      const interval = setInterval(async () => {
        const state = await rimworldApi.fetchGameState();
        if (state && state.program_state === 'Playing' && state.colonist_count > 0) {
          setGameStatus('playing');
          clearInterval(interval);
        }
      }, 5000);
    } catch (error) {
      console.error("Failed to trigger load game:", error);
    }
  };

  const renderContent = () => {
    if (!isConfigured) {
      return <ApiConfig onApiUrlChange={handleApiUrlChange} currentUrl={apiUrl} />;
    }

    switch (gameStatus) {
      case 'checking':
        return <LoadingScreen message="Checking game state..." />;
      case 'api_error':
        return <ApiConfig onApiUrlChange={handleApiUrlChange} currentUrl={apiUrl} onResetConfig={handleResetConfig} />;
      case 'menu':
        return <StartGameScreen onStartQuickGame={handleStartGame} onLoadGame={handleLoadGame} onConfigureApi={handleResetConfig} />;
      case 'playing':
        return (
          <ToastProvider>
            <RimWorldDashboard apiUrl={apiUrl} onResetConfig={handleResetConfig} onGameStateChange={checkGameState} />
            <ToastContainer />
          </ToastProvider>
        );
      default:
        return <ApiConfig onApiUrlChange={handleApiUrlChange} currentUrl={apiUrl} onResetConfig={handleResetConfig} />;
    }
  };

  return (
    <ImageCacheProvider>
      <div className="App">
        {renderContent()}
      </div>
    </ImageCacheProvider>
  );
}

export default App;
