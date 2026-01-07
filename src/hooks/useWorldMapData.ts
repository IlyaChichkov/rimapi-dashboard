// src/features/dashboard/hooks/useWorldMapData.ts
import { useState, useEffect, useRef } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { processFactionIcon } from '@/utils/iconProcessor';
import { WorldTile, WorldSettlement } from '@/types/worldTypes';
import { Caravan, CaravanPathData } from '@/types';

export const useWorldMapData = (refreshInterval = 5000) => { // Reduced interval for smoother updates
    const [tiles, setTiles] = useState<WorldTile[]>([]);
    const [settlements, setSettlements] = useState<WorldSettlement[]>([]);
    const [caravans, setCaravans] = useState<Caravan[]>([]);
    
    // New State: Map[CaravanID -> PathData]
    const [caravanPaths, setCaravanPaths] = useState<Record<number, CaravanPathData>>({});
    
    const [factionIcons, setFactionIcons] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [centerTileId, setCenterTileId] = useState<number | null>(null);

    const processedFactionIds = useRef<Set<number>>(new Set());

    useEffect(() => {
        let isMounted = true;

        const fetchAndSetData = async () => {
            try {
                let currentCenter = centerTileId;

                // 1. Find Center
                if (currentCenter === null) {
                    const mySettlements = await rimworldApi.getWorldPlayerSettlements();
                    if (!isMounted) return;
                    if (mySettlements && mySettlements.length > 0) {
                        currentCenter = mySettlements[0].tile_id;
                        setCenterTileId(currentCenter);
                    } else {
                        if (isMounted) { setError("No player settlement found."); setLoading(false); }
                        return;
                    }
                }

                // 2. Fetch Base Data
                const [gridData, allSettlements, allCaravans, allFactions] = await Promise.all([
                    rimworldApi.getWorldGridArea(currentCenter, 12),
                    rimworldApi.getWorldSettlements(),
                    rimworldApi.getCaravans(),
                    rimworldApi.fetchAllFactions()
                ]);

                if (!isMounted) return;

                if (gridData && allSettlements && allCaravans) {
                    setTiles(gridData);
                    setSettlements(allSettlements);
                    setCaravans(allCaravans);
                    setError(null);

                    // 3. FETCH CARAVAN PATHS (New Logic)
                    if (allCaravans.length > 0) {
                        const newPaths: Record<number, CaravanPathData> = {};
                        // Fetch path for every caravan in parallel
                        await Promise.all(allCaravans.map(async (c) => {
                            try {
                                const path = await rimworldApi.getCaravanPath(c.id);
                                if (path) newPaths[c.id] = path;
                            } catch (e) {
                                console.warn(`Failed to fetch path for caravan ${c.id}`);
                            }
                        }));
                        if (isMounted) setCaravanPaths(newPaths);
                    }

                    // 4. Process Faction Icons (Existing Logic)
                    if (allFactions) {
                        const factionsToFetch = allFactions.filter(f => !processedFactionIds.current.has(f.load_id));
                        if (factionsToFetch.length > 0) {
                            factionsToFetch.forEach(f => processedFactionIds.current.add(f.load_id));
                            for (const faction of factionsToFetch) {
                                if (!isMounted) break;
                                try {
                                    const iconResponse = await rimworldApi.getFactionIcon(faction.load_id);
                                    if (iconResponse) {
                                        const processedUrl = await processFactionIcon(iconResponse);
                                        if (processedUrl && isMounted) {
                                            setFactionIcons(prev => ({ ...prev, [faction.load_id]: processedUrl }));
                                        }
                                    }
                                } catch (e) { console.error(e); }
                                if (isMounted) await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setError("Failed to load map data.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAndSetData();
        const interval = setInterval(fetchAndSetData, refreshInterval);
        return () => { isMounted = false; clearInterval(interval); };
    }, [centerTileId, refreshInterval]);

    return { tiles, settlements, caravans, factionIcons, caravanPaths, loading, error, centerTileId };
};