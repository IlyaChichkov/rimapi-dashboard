// src/widgets/WorldMap/WorldMap2D.tsx
import React, { useState, useMemo, useRef } from 'react';
import { WorldTile, WorldSettlement, WorldCaravan } from '../../../types/worldTypes';
import { BIOME_TEXTURES, getBiomeColor } from './BiomeAssets';
import { Delaunay } from 'd3-delaunay';
import HomeSvg from '../../../assets/map/home.svg';
interface WorldMap2DProps {
    tiles: WorldTile[];
    settlements: WorldSettlement[];
    caravans: WorldCaravan[];
    centerTileId: number;
}

const WorldMap2D: React.FC<WorldMap2DProps> = ({ tiles, settlements, caravans, centerTileId }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, tile: WorldTile } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { renderTiles, vbX, vbY, vbWidth, vbHeight, activeBiomes } = useMemo(() => {
        if (tiles.length === 0) return { renderTiles: [], vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, activeBiomes: [] };

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
        const VIEW_SIZE = 200;

        // 5. Get Unique Biomes (To generate only necessary patterns)
        const uniqueBiomes = Array.from(new Set(tiles.map(t => t.biome)));

        return {
            renderTiles: processedTiles,
            vbX: centerPx.x - (VIEW_SIZE / 2),
            vbY: centerPx.y - (VIEW_SIZE / 2),
            vbWidth: VIEW_SIZE,
            vbHeight: VIEW_SIZE,
            activeBiomes: uniqueBiomes
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
                <defs>
                    {/* GENERATE TEXTURE PATTERNS */}
                    {activeBiomes.map(biome => {
                        const textureUrl = BIOME_TEXTURES[biome];
                        if (!textureUrl) return null; // Skip if no texture defined

                        return (
                            <pattern
                                key={biome}
                                id={`pat-${biome}`}
                                patternUnits="userSpaceOnUse"
                                width="64" height="64" // Size of the repeating pattern in grid pixels
                            >
                                <image
                                    href={textureUrl}
                                    x="0" y="0"
                                    width="64" height="64"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            </pattern>
                        );
                    })}
                </defs>

                {renderTiles.map(tile => {
                    const settlement = settlements.find(s => s.tile_id === tile.id);
                    const caravan = caravans.find(c => c.tile_id === tile.id);
                    const isCenter = tile.id === centerTileId;

                    // Logic: Use Texture if available, else Fallback Color
                    const hasTexture = BIOME_TEXTURES[tile.biome];
                    const fill = hasTexture ? `url(#pat-${tile.biome})` : getBiomeColor(tile.biome);

                    return (
                        <g
                            key={tile.id}
                            onMouseEnter={() => setTooltip({ x: tile.x, y: tile.y, tile })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        >
                            <path
                                d={tile.path}
                                fill={fill}
                                stroke={isCenter ? '#fff' : 'rgba(55, 49, 56, 0.3)'}
                                strokeWidth={isCenter ? 3 : 1}
                            // Add a subtle filter or opacity if textures are too bright
                            // opacity={0.9} 
                            />

                            {/* Icons */}
                            {settlement && (
                                <image
                                    href={HomeSvg}
                                    x="-5" y="-4"
                                    width="10" height="8"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            )}
                            {caravan && !settlement && (
                                <text x={tile.x} y={tile.y + 5} fontSize={14} textAnchor="middle" style={{ pointerEvents: 'none', textShadow: '0 1px 4px black' }}>
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