import { useState, useEffect, useRef, useCallback } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { processFactionIcon } from '@/utils/iconProcessor';
import { WorldTile, WorldSettlement } from '@/types/worldTypes';
import { Caravan, CaravanPathData } from '@/types';
import { useAutoRefresh } from '@/components/context/AutoRefreshContext'; // <--- IMPORT CONTEXT

export const useWorldMapData = (refreshInterval = 10000) => {
    // 1. Consume Context
    const { isAutoRefreshEnabled, refreshSignal } = useAutoRefresh();

    const [tiles, setTiles] = useState<WorldTile[]>([]);
    const [settlements, setSettlements] = useState<WorldSettlement[]>([]);
    const [caravans, setCaravans] = useState<Caravan[]>([]);
    const [caravanPaths, setCaravanPaths] = useState<Record<number, CaravanPathData>>({});
    const [factionIcons, setFactionIcons] = useState<Record<number, string>>({});
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [centerTileId, setCenterTileId] = useState<number | null>(null);

    const processedFactionIds = useRef<Set<number>>(new Set());

    // 2. Define Fetch Logic (Wrapped in useCallback)
    const fetchMapData = useCallback(async () => {
        try {
            let currentCenter = centerTileId;

            // A. Find Center (if missing)
            if (currentCenter === null) {
                const mySettlements = await rimworldApi.getWorldPlayerSettlements();
                if (mySettlements && mySettlements.length > 0) {
                    currentCenter = mySettlements[0].tile_id;
                    setCenterTileId(currentCenter);
                } else {
                    setError("No player settlement found.");
                    setLoading(false);
                    return;
                }
            }

            // B. Fetch Core Data
            const [gridData, allSettlements, allCaravans, allFactions] = await Promise.all([
                rimworldApi.getWorldGridArea(currentCenter, 12),
                rimworldApi.getWorldSettlements(),
                rimworldApi.getCaravans(),
                rimworldApi.fetchAllFactions()
            ]);

            if (gridData && allSettlements && allCaravans) {
                setTiles(gridData);
                setSettlements(allSettlements);
                setCaravans(allCaravans);
                setError(null);
                
                // Unblock UI immediately
                setLoading(false);

                // C. Background: Fetch Paths
                if (allCaravans.length > 0) {
                    Promise.all(allCaravans.map(async (c) => {
                        try {
                            const path = await rimworldApi.getCaravanPath(c.id);
                            return path ? { id: c.id, path } : null;
                        } catch { return null; }
                    })).then((results) => {
                        const newPaths: Record<number, CaravanPathData> = {};
                        results.forEach(r => { if(r) newPaths[r.id] = r.path; });
                        setCaravanPaths(prev => ({ ...prev, ...newPaths }));
                    });
                }

                // D. Background: Fetch Icons (Only new ones)
                if (allFactions) {
                    const factionsToFetch = allFactions.filter(f => !processedFactionIds.current.has(f.load_id));
                    if (factionsToFetch.length > 0) {
                        factionsToFetch.forEach(f => processedFactionIds.current.add(f.load_id));
                        // Fire-and-forget async loop
                        (async () => {
                            for (const faction of factionsToFetch) {
                                try {
                                    const iconResponse = await rimworldApi.getFactionIcon(faction.load_id);
                                    if (iconResponse) {
                                        const processedUrl = await processFactionIcon(iconResponse);
                                        if (processedUrl) {
                                            setFactionIcons(prev => ({ ...prev, [faction.load_id]: processedUrl }));
                                        }
                                    }
                                } catch (e) { console.warn(e); }
                                await new Promise(resolve => setTimeout(resolve, 50)); // Throttle
                            }
                        })();
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load world map.");
            setLoading(false);
        }
    }, [centerTileId]); // Dependency on centerTileId

    // 3. Initial Load Effect
    useEffect(() => {
        fetchMapData();
    }, []); // Run once on mount

    // 4. Auto Refresh Effect (Controlled by Context)
    useEffect(() => {
        if (!isAutoRefreshEnabled) return; // STOP here if disabled

        const interval = setInterval(fetchMapData, refreshInterval);
        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled, refreshInterval, fetchMapData]);

    // 5. Manual Refresh Effect (Triggered by Navbar)
    useEffect(() => {
        if (refreshSignal > 0) {
            // Optional: Set loading true briefly if you want visual feedback
            // setLoading(true); 
            fetchMapData();
        }
    }, [refreshSignal, fetchMapData]);

    return { 
        tiles, 
        settlements, 
        caravans, 
        factionIcons, 
        caravanPaths, 
        loading, 
        error, 
        centerTileId 
    };
};