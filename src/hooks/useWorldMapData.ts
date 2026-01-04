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

    useEffect(() => {
        let isMounted = true;

        const fetchAndSetData = async () => {
            try {
                let currentCenter = centerTileId;

                // Step 1: Find center tile if we don't have it
                if (currentCenter === null) {
                    const mySettlements = await rimworldApi.getWorldPlayerSettlements();
                    if (!isMounted) return;

                    if (mySettlements && mySettlements.length > 0 && typeof mySettlements[0].tile_id === 'number') {
                        currentCenter = mySettlements[0].tile_id;
                        // This state update will trigger a re-run of the effect, which will
                        // clear the current interval and set up a new one with the updated centerTileId.
                        setCenterTileId(currentCenter);
                    } else {
                        if (isMounted) {
                            setError("No player settlement found to center the map.");
                            setLoading(false);
                        }
                        return;
                    }
                }
                
                // If we just found the center, the state won't be updated in *this* run of the effect.
                // However, the `currentCenter` local variable *is* updated, so we can proceed.
                // When the effect re-runs due to the state change, the 'if' block will be skipped.

                // Step 2: Fetch all grid/world data in parallel
                const [gridData, allSettlements, allCaravans] = await Promise.all([
                    rimworldApi.getWorldGridArea(currentCenter, 12),
                    rimworldApi.getWorldSettlements(),
                    rimworldApi.getWorldCaravans()
                ]);

                if (!isMounted) return;

                if (gridData == null || allSettlements == null || allCaravans == null) {
                     if (isMounted) setError("Failed to load partial map data.");
                     return;
                }
                
                if (isMounted) {
                    setTiles(gridData);
                    setSettlements(allSettlements);
                    setCaravans(allCaravans);
                    setError(null);
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
    }, [centerTileId, refreshInterval]); // Re-run effect if centerTileId changes

    return { tiles, settlements, caravans, loading, error, centerTileId };
};
