// src/features/dashboard/hooks/useWorldMapData.ts
import { useState, useEffect } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { WorldTile, WorldSettlement, WorldCaravan }  from '@/types/worldTypes';

export const useWorldMapData = (refreshInterval = 10000) => {
    const [tiles, setTiles] = useState<WorldTile[]>([]);
    const [settlements, setSettlements] = useState<WorldSettlement[]>([]);
    const [caravans, setCaravans] = useState<WorldCaravan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [centerTileId, setCenterTileId] = useState<number | null>(null);

    const fetchMapData = async () => {
        try {
            // 1. Get Player Settlements to find "Home"
            // We cache the centerTileId so we don't re-fetch it constantly if it hasn't changed
            let currentCenter = centerTileId;
            
            if (currentCenter === null) {
                const mySettlements = await rimworldApi.getWorldPlayerSettlements();
                if (mySettlements == null) return;
                if (mySettlements.length > 0) {
                    currentCenter = mySettlements[0].tile;
                    setCenterTileId(currentCenter);
                } else {
                    // Fallback if no settlement (e.g., nomad run), pick arbitrary tile or fail
                    setError("No player settlement found.");
                    setLoading(false);
                    return;
                }
            }

            // 2. Parallel Fetch: Grid Area + All Settlements + Caravans
            const [gridData, allSettlements, allCaravans] = await Promise.all([
                rimworldApi.getWorldGridArea(currentCenter, 12), // Radius 12 is ~450 tiles, good for performance
                rimworldApi.getWorldSettlements(),
                rimworldApi.getWorldCaravans()
            ]);

            if (gridData == null) return;
            if (allSettlements == null) return;
            if (allCaravans == null) return;
            setTiles(gridData);
            setSettlements(allSettlements);
            setCaravans(allCaravans);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load world map.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMapData();
        const interval = setInterval(fetchMapData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]); // eslint-disable-line

    return { tiles, settlements, caravans, loading, error, centerTileId };
};