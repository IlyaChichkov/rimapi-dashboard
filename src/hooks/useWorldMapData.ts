// src/features/dashboard/hooks/useWorldMapData.ts
import { useState, useEffect, useRef } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { processFactionIcon } from '@/utils/iconProcessor';
import { WorldTile, WorldSettlement, WorldCaravan } from '@/types/worldTypes';

export const useWorldMapData = (refreshInterval = 10000) => {
    const [tiles, setTiles] = useState<WorldTile[]>([]);
    const [settlements, setSettlements] = useState<WorldSettlement[]>([]);
    const [caravans, setCaravans] = useState<WorldCaravan[]>([]);
    
    // Stores processed Base64 URLs: { [load_id]: "data:image/png;base64,..." }
    const [factionIcons, setFactionIcons] = useState<Record<number, string>>({});
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [centerTileId, setCenterTileId] = useState<number | null>(null);

    // Track which IDs we've successfully processed to avoid re-fetching
    const processedFactionIds = useRef<Set<number>>(new Set());

    useEffect(() => {
        let isMounted = true;

        const fetchAndSetData = async () => {
            try {
                let currentCenter = centerTileId;

                // 1. Find Center (Player Home)
                if (currentCenter === null) {
                    const mySettlements = await rimworldApi.getWorldPlayerSettlements();
                    if (!isMounted) return;

                    if (mySettlements && mySettlements.length > 0) {
                        currentCenter = mySettlements[0].tile_id;
                        setCenterTileId(currentCenter);
                    } else {
                        if (isMounted) {
                            setError("No player settlement found.");
                            setLoading(false);
                        }
                        return;
                    }
                }

                // 2. Fetch Map Data AND Faction List
                const [gridData, allSettlements, allCaravans, allFactions] = await Promise.all([
                    rimworldApi.getWorldGridArea(currentCenter, 12),
                    rimworldApi.getWorldSettlements(),
                    rimworldApi.getWorldCaravans(),
                    rimworldApi.fetchAllFactions()
                ]);

                if (!isMounted) return;

                if (gridData && allSettlements && allCaravans) {
                    setTiles(gridData);
                    setSettlements(allSettlements);
                    setCaravans(allCaravans);
                    setError(null);

                    // 3. Process Icons for ALL Factions found in the game
                    if (allFactions) {
                        // Filter to find IDs we haven't processed yet
                        const factionsToFetch = allFactions.filter(f => 
                            !processedFactionIds.current.has(f.load_id)
                        );

                        if (factionsToFetch.length > 0) {
                            // Mark them as processed immediately so we don't try again in next interval
                            factionsToFetch.forEach(f => processedFactionIds.current.add(f.load_id));

                            // --- SEQUENTIAL PROCESSING ---
                            // We use a for...of loop with await to process one by one
                            for (const faction of factionsToFetch) {
                                if (!isMounted) break; // Stop if component unmounted

                                try {
                                    // Fetch Raw Data
                                    const iconResponse = await rimworldApi.getFactionIcon(faction.load_id);
                                    
                                    if (iconResponse) {
                                        // Tint/Process via Canvas
                                        const processedUrl = await processFactionIcon(iconResponse);
                                        
                                        if (processedUrl && isMounted) {
                                            setFactionIcons(prev => ({
                                                ...prev,
                                                [faction.load_id]: processedUrl
                                            }));
                                        }
                                    }
                                } catch (e) {
                                    console.error(`Failed to load icon for faction ${faction.name}`, e);
                                }

                                // Delay between requests (300ms) to go easy on the server
                                if (isMounted) {
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setError("Failed to load world map data.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAndSetData();
        const interval = setInterval(fetchAndSetData, refreshInterval);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [centerTileId, refreshInterval]);

    return { tiles, settlements, caravans, factionIcons, loading, error, centerTileId };
};