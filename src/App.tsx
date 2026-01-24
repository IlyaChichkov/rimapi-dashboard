// src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import RimWorldDashboard from './features/dashboard/Dashboard';
import ApiConfig from './features/api-config/ApiConfig';
import StartGameScreen from './features/api-config/StartGameScreen';
import LoadingScreen from './components/common/LoadingScreen';
import './App.css';
import { ToastContainer } from './components/feedback/ToastContainer';
import { ToastProvider } from './components/feedback/ToastContext';
import { ImageCacheProvider } from './components/context/ImageCacheContext';
import { sseService } from './services/sseService';
import { rimworldApi, setApiBaseUrl } from './services/rimworldApi';
import { AutoRefreshProvider } from './components/context/AutoRefreshContext';

type GameStatus = 'checking' | 'menu' | 'playing' | 'api_error';

function App() {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('checking');

  // Load configuration on startup
  useEffect(() => {
    const savedUrl = localStorage.getItem('rimworldApiUrl');
    if (savedUrl) {
      setApiUrl(savedUrl);
      setApiBaseUrl(savedUrl);
      sseService.setApiUrl(savedUrl);
      setIsConfigured(true);
    } else {

      // TODO: change to selected URL
      setApiUrl('http://localhost:8765/api/v1');
    }
  }, []);

  // Check state via REST API
  const checkGameState = useCallback(async () => {
    // Only show "checking" if we are in a disconnected/error state
    // This prevents the screen from flashing "Checking..." if we are already in the menu or playing
    setGameStatus(prev => (prev === 'api_error' || prev === 'checking') ? 'checking' : prev);

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

  // --- SSE EVENT HANDLING ---
  useEffect(() => {
    if (!isConfigured) return;

    // 1. Handler for Named Events (standard SSE)
    const handleNamedGameLoaded = (e: any) => {
      console.log("App: Received Named 'game_loaded' Event", e);
      setGameStatus('playing');
    };

    const handleNamedExit = (e: any) => {
      console.log("App: Received Named 'exit_to_menu' Event", e);
      setGameStatus('menu');
    };

    // Listen to specific events
    sseService.addEventListener('game_state', handleNamedGameLoaded);

    // Initial connections
    checkGameState();
    sseService.connect();

    return () => {
      sseService.removeEventListener('game_state', handleNamedGameLoaded);
    };
  }, [isConfigured, checkGameState]);

  const handleApiUrlChange = (url: string) => {
    const cleanUrl = url.replace(/\/$/, '');
    localStorage.setItem('rimworldApiUrl', cleanUrl);
    setApiUrl(cleanUrl);
    setApiBaseUrl(cleanUrl);
    sseService.setApiUrl(cleanUrl);
    sseService.disconnect(); // Disconnect old
    setIsConfigured(true);
    setGameStatus('checking');
  };

  const handleResetConfig = () => {
    localStorage.removeItem('rimworldApiUrl');
    sseService.disconnect();
    setIsConfigured(false);
  };

  const handleStartGame = async () => {
    try {
      await rimworldApi.startGame();
      // We rely on SSE now, but keep a fallback check
      setTimeout(checkGameState, 8000);
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  const handleLoadGame = async (saveName: string) => {
    if (!saveName) return;
    try {
      await rimworldApi.loadGame(saveName);
      // Wait for SSE to trigger the switch
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
        return <LoadingScreen message="Connecting to RimWorld..." />;
      case 'api_error':
        return <ApiConfig onApiUrlChange={handleApiUrlChange} currentUrl={apiUrl} onResetConfig={handleResetConfig} />;
      case 'menu':
        return <StartGameScreen onStartQuickGame={handleStartGame} onLoadGame={handleLoadGame} onConfigureApi={handleResetConfig} />;
      case 'playing':
        return (
          <ToastProvider>
            <AutoRefreshProvider>
              <RimWorldDashboard
                apiUrl={apiUrl}
                onResetConfig={handleResetConfig}
                onGameStateChange={checkGameState}
              />
            </AutoRefreshProvider>
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