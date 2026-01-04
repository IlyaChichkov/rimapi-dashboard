import React from 'react';
import WorldScene from './WorldScene';
import './WorldMapCard.css';
import DashboardCard from '../common/DashboardCard';
import { useWorldMapData } from '@/hooks/useWorldMapData';

const WorldMapCard: React.FC<{ onRemove?: () => void }> = ({ onRemove }) => {
    const { tiles, settlements, caravans, loading, error, centerTileId } = useWorldMapData();

    if (loading) return (
        <div className="wm-loading">Scanning planetary data...</div>
    );

    if (error || !centerTileId) return (
        <div className="wm-error">{error || "No map data available"}</div>
    );

    return (
        <div className="wm-scene-container">
            <WorldScene
                tiles={tiles}
                settlements={settlements}
                caravans={caravans}
                centerTileId={centerTileId}
            />

            <div className="wm-overlay-info">
                <span className="wm-badge">{tiles.length} Tiles Scanned</span>
                <span className="wm-badge">{settlements.length} Settlements</span>
            </div>
        </div>
    );
};

export default WorldMapCard;