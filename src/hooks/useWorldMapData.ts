// src/features/dashboard/hooks/useWorldMapData.ts
import { useState, useEffect, useRef } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { processFactionIcon } from '@/utils/iconProcessor';
import { WorldTile, WorldSettlement } from '@/types/worldTypes';
import { Caravan, CaravanPathData } from '@/types';

export const useWorldMapData = (refreshInterval = 5000) => {
    const [tiles, setTiles] = useState<WorldTile[]>([]);
    const [settlements, setSettlements] = useState<WorldSettlement[]>([]);
    const [caravans, setCaravans] = useState<Caravan[]>([]);
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

                // 1. Find Center if needed
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

                // 2. Fetch Map Geometry & Objects
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
                    
                    // CRITICAL: Set loading to false HERE so map renders immediately
                    // while icons and paths load in background
                    setLoading(false); 

                    // 3. Background Fetch: Caravan Paths
                    if (allCaravans.length > 0) {
                        // We do this async without awaiting the whole block to block UI
                        Promise.all(allCaravans.map(async (c) => {
                            try {
                                const path = await rimworldApi.getCaravanPath(c.id);
                                return path ? { id: c.id, path } : null;
                            } catch { return null; }
                        })).then((results) => {
                            if (!isMounted) return;
                            const newPaths: Record<number, CaravanPathData> = {};
                            results.forEach(r => { if(r) newPaths[r.id] = r.path; });
                            setCaravanPaths(prev => ({ ...prev, ...newPaths }));
                        });
                    }

                    // 4. Background Fetch: Faction Icons (Sequential to be nice to server)
                    if (allFactions) {
                        const factionsToFetch = allFactions.filter(f => !processedFactionIds.current.has(f.load_id));
                        if (factionsToFetch.length > 0) {
                            factionsToFetch.forEach(f => processedFactionIds.current.add(f.load_id));
                            
                            // Fire and forget this async loop
                            (async () => {
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
                                    // Small delay to prevent UI stutter
                                    if (isMounted) await new Promise(resolve => setTimeout(resolve, 100));
                                }
                            })();
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setError("Failed to load map data.");
                setLoading(false); // Ensure loading stops on error
            }
        };

        fetchAndSetData();
        const interval = setInterval(fetchAndSetData, refreshInterval);
        return () => { isMounted = false; clearInterval(interval); };
    }, [centerTileId, refreshInterval]);

    return { tiles, settlements, caravans, factionIcons, caravanPaths, loading, error, centerTileId };
};