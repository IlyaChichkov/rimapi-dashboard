// src/widgets/WorldMap/WorldMap2D.tsx
import React, { useState, useMemo, useRef } from 'react';
import { WorldTile, WorldSettlement, WorldCaravan } from '../../../types/worldTypes';
import { getBiomeColor } from './BiomeColors';
import { Delaunay } from 'd3-delaunay';
interface WorldMap2DProps {
    tiles: WorldTile[];
    settlements: WorldSettlement[];
    caravans: WorldCaravan[];
    centerTileId: number;
}
import { BIOME_TEXTURES } from './BiomeAssets'; // Import the new mapping

const WorldMap2D: React.FC<WorldMap2DProps> = ({ tiles, settlements, caravans, centerTileId }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, tile: WorldTile } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { renderTiles, vbX, vbY, vbWidth, vbHeight } = useMemo(() => {
        if (tiles.length === 0) return { renderTiles: [], vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100 };

        const centerTile = tiles.find(t => t.id === centerTileId) || tiles[0];
        const cLat = centerTile.lat;
        const cLon = centerTile.lon;
        const D2R = Math.PI / 180;

        // 1. PROJECT TO 2D PLANE
        // Scale factor: 1 Degree ~ 60 pixels
        const GLOBAL_SCALE = 60;
        const latCorrection = Math.cos(cLat * D2R);

        // Prepare points for Voronoi generation
        // We map them to a simple array of [x, y]
        const points = tiles.map(tile => {
            const dLat = tile.lat - cLat;
            const dLon = tile.lon - cLon;

            // Standard Equirectangular projection
            const x = dLon * latCorrection * GLOBAL_SCALE;
            const y = -dLat * GLOBAL_SCALE; // Invert Y because SVG Y is down
            return { x, y, tile };
        });

        // 2. GENERATE VORONOI DIAGRAM
        // This calculates the exact polygon shape for each point
        // d3-delaunay requires a flat array [x0, y0, x1, y1, ...] or array of arrays
        const pointList = points.map(p => [p.x, p.y] as [number, number]);
        const delaunay = Delaunay.from(pointList);

        // Define a bounding box for the Voronoi (large enough to cover all points)
        // If we don't bind it, edge tiles go to infinity.
        const bounds = [-10000, -10000, 10000, 10000];
        const voronoi = delaunay.voronoi(bounds as [number, number, number, number]);

        // 3. MAP PATHS TO TILES
        const processedTiles = points.map((p, i) => {
            // renderCell(i) returns the SVG Path string ("M-10,0 L...") for point i
            const path = voronoi.renderCell(i);
            return {
                ...p.tile,
                x: p.x,
                y: p.y,
                path: path
            };
        });

        // 4. CALCULATE VIEWBOX (ZOOM)
        const centerPx = points.find(p => p.tile.id === centerTileId) || points[0];

        // Visual Radius: How many "pixels" of map to show?
        // 60px approx 1 tile width. 
        // 400px = approx 6-7 tiles radius.
        const VIEW_SIZE = 200;

        return {
            renderTiles: processedTiles,
            vbX: centerPx.x - (VIEW_SIZE / 2),
            vbY: centerPx.y - (VIEW_SIZE / 2),
            vbWidth: VIEW_SIZE,
            vbHeight: VIEW_SIZE
        };

    }, [tiles, centerTileId]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#0d1117' }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ overflow: 'visible' }}
            >

                {renderTiles.map(tile => {
                    const settlement = settlements.find(s => s.tile_id === tile.id);
                    const caravan = caravans.find(c => c.tile_id === tile.id);
                    const isCenter = tile.id === centerTileId;
                    const color = getBiomeColor(tile.biome);

                    return (
                        <g
                            key={tile.id}
                            onMouseEnter={() => setTooltip({ x: tile.x, y: tile.y, tile })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        >
                            {/* VORONOI CELL PATH */}
                            <path
                                d={tile.path}
                                fill={color}
                                stroke={isCenter ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.15)'}
                                strokeWidth={isCenter ? 3 : 1}
                                opacity={0.9}
                            />

                            {/* Icons - Centered on the tile's point */}
                            {/* Note: We use tile.x/y directly because the path is absolute, no group transform needed */}
                            {settlement && (
                                <text
                                    x={tile.x}
                                    y={tile.y + 5}
                                    fontSize={14}
                                    textAnchor="middle"
                                    style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                >
                                    {settlement.faction.is_player ? '🏠' : '🛖'}
                                </text>
                            )}
                            {caravan && !settlement && (
                                <text
                                    x={tile.x}
                                    y={tile.y + 5}
                                    fontSize={14}
                                    textAnchor="middle"
                                    style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                >
                                    🐫
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '16px',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 25, 35, 0.95)',
                    border: '1px solid #555',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    color: '#eee',
                    pointerEvents: 'none',
                    fontSize: '0.8rem',
                    zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                    textAlign: 'center',
                    minWidth: '160px',
                    whiteSpace: 'nowrap'
                }}>
                    <div style={{ color: '#69db7c', fontWeight: 'bold', marginBottom: '4px' }}>
                        {tooltip.tile.biome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                        Ele: {tooltip.tile.elevation}m • Temp: {tooltip.tile.temperature.toFixed(1)}°C
                    </div>
                    {settlements.find(s => s.tile_id === tooltip.tile.id) && (
                        <div style={{ color: '#ffd43b', marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px' }}>
                            {settlements.find(s => s.tile_id === tooltip.tile.id)?.name}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorldMap2D;