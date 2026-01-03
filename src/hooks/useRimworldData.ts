import { useState, useCallback, useEffect } from 'react';
import { fetchRimWorldData, setApiBaseUrl } from '../services/rimworldApi';
import { RimWorldData, Colonist } from '../types';

export const useRimWorldData = (apiUrl: string, onGameStateChange: () => void) => {
  const [data, setData] = useState<RimWorldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Set API Base URL whenever prop changes
  useEffect(() => {
    setApiBaseUrl(apiUrl);
  }, [apiUrl]);

  const loadData = useCallback(async () => {
    try {
      // Don't set loading to true on background refreshes to avoid UI flicker
      if (!data) setLoading(true); 
      
      const rimWorldData = await fetchRimWorldData();
      
      // Game State Check
      if (!rimWorldData.gameState || (rimWorldData.gameState as any).program_state !== 'Playing' || !rimWorldData.colonists || rimWorldData.colonists.length === 0) {
        onGameStateChange();
        return;
      }

      setData(rimWorldData);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching RimWorld data:', error);
      setError('Failed to load data from RimWorld API');
    } finally {
      setLoading(false);
    }
  }, [onGameStateChange, data]);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto Refresh Logic
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(loadData, 5000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, loadData]);

  // Sorting Logic Helper
  const getSortedColonists = useCallback((colonists: Colonist[], sortBy: 'name' | 'mood') => {
    const sorted = [...colonists];
    switch (sortBy) {
      case 'mood':
        return sorted.sort((a, b) => (b.mood || 0) - (a.mood || 0));
      case 'name':
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    autoRefresh,
    setAutoRefresh, // Expose setter for toggle
    refresh: loadData,
    getSortedColonists
  };
};