// src/widgets/WorldMap/WorldMapCard.tsx
import React from 'react';
import './WorldMapCard.css';
import { useWorldMapData } from '@/hooks/useWorldMapData';
import WorldMap2D from './WorldMap2D'; // Import the new 2D component
import './WorldMapCard.css';

const WorldMapCard: React.FC<{ onRemove?: () => void }> = ({ onRemove }) => {
    const { tiles, settlements, caravans, factionIcons, loading, error, centerTileId } = useWorldMapData();

    if (loading) return (
        <div className="wm-loading">Scanning planetary data...</div>
    );

    if (error || !centerTileId) return (
        <div className="wm-error">{error || "No map data available"}</div>
    );

    return (
        <div className="wm-scene-container">
            <WorldMap2D
                tiles={tiles}
                settlements={settlements}
                caravans={caravans}
                centerTileId={centerTileId}
                factionIcons={factionIcons}
            />
        </div>
    );
};

export default WorldMapCard;