// src/widgets/WorldMap/WorldMap2D.tsx
import React, { useState, useMemo, useRef } from 'react';
import { Delaunay } from 'd3-delaunay';
import HomeSvg from '../../../assets/map/home.svg';
import { WorldTile, WorldSettlement, WorldCaravan } from '../../../types/worldTypes';
import { BIOME_TEXTURES, getBiomeColor } from './BiomeAssets';

interface WorldMap2DProps {
    tiles: WorldTile[];
    settlements: WorldSettlement[];
    caravans: WorldCaravan[];
    centerTileId: number;
}

// Helper to determine line style based on def name
const getRoadStyle = (defName: string) => {
    switch (defName) {
        case 'AncientAsphaltRoad': return { color: '#333', width: 4, dash: '' };
        case 'AncientAsphaltHighway': return { color: '#222', width: 5, dash: '' };
        case 'StoneRoad': return { color: '#554', width: 3, dash: '' };
        case 'DirtRoad': return { color: '#765', width: 2, dash: '4,2' };
        default: return { color: '#654', width: 1, dash: '2,2' }; // Pathways
    }
};

const getRiverStyle = (defName: string) => {
    switch (defName) {
        case 'HugeRiver': return { width: 6, color: '#4fc3f7' };
        case 'LargeRiver': return { width: 4.5, color: '#4fc3f7' };
        case 'River': return { width: 3, color: '#81d4fa' };
        case 'Creek': return { width: 1.5, color: '#b3e5fc' };
        default: return { width: 1, color: '#e1f5fe' };
    }
};

const WorldMap2D: React.FC<WorldMap2DProps> = ({ tiles, settlements, caravans, centerTileId }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, tile: WorldTile } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { renderTiles, roads, rivers, vbX, vbY, vbWidth, vbHeight, activeBiomes } = useMemo(() => {
        if (tiles.length === 0) return { renderTiles: [], roads: [], rivers: [], vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, activeBiomes: [] };

        const centerTile = tiles.find(t => t.id === centerTileId) || tiles[0];
        const cLat = centerTile.lat;
        const cLon = centerTile.lon;
        const D2R = Math.PI / 180;
        const GLOBAL_SCALE = 60;
        const latCorrection = Math.cos(cLat * D2R);

        // 1. Calculate Points
        const points = tiles.map(tile => {
            const dLat = tile.lat - cLat;
            const dLon = tile.lon - cLon;
            const x = dLon * latCorrection * GLOBAL_SCALE;
            const y = -dLat * GLOBAL_SCALE;
            return { x, y, tile };
        });

        // 2. Generate Voronoi
        const pointList = points.map(p => [p.x, p.y] as [number, number]);
        const delaunay = Delaunay.from(pointList);
        const bounds = [-10000, -10000, 10000, 10000];
        const voronoi = delaunay.voronoi(bounds as [number, number, number, number]);

        // 3. Map Tiles & Create Lookup Map for Connections
        const tileLookup = new Map<number, { x: number, y: number }>();
        const processedTiles = points.map((p, i) => {
            tileLookup.set(p.tile.id, { x: p.x, y: p.y });
            return {
                ...p.tile,
                x: p.x,
                y: p.y,
                path: voronoi.renderCell(i)
            };
        });

        // 4. Process Connections (Roads & Rivers)
        const processedRoads: any[] = [];
        const processedRivers: any[] = [];
        const processedConnections = new Set<string>(); // To avoid drawing A->B and B->A twice

        processedTiles.forEach(tile => {
            // Helper to parse "ID:Type" strings
            const addConnection = (list: string[], targetArray: any[], type: 'road' | 'river') => {
                if (!list) return;

                list.forEach(entry => {
                    const [neighborIdStr, defName] = entry.split(':');
                    const neighborId = parseInt(neighborIdStr);
                    const neighborPos = tileLookup.get(neighborId);

                    // Skip if the neighbor isn't in our loaded area (grid/area only returns local patch)
                    if (!neighborPos) return;

                    // Deduplicate: Create a sorted key "minID-maxID"
                    const key = tile.id < neighborId ? `${tile.id}-${neighborId}-${defName}` : `${neighborId}-${tile.id}-${defName}`;
                    if (processedConnections.has(key)) return;
                    processedConnections.add(key);

                    targetArray.push({
                        x1: tile.x,
                        y1: tile.y,
                        x2: neighborPos.x,
                        y2: neighborPos.y,
                        defName,
                        style: type === 'road' ? getRoadStyle(defName) : getRiverStyle(defName)
                    });
                });
            };

            addConnection(tile.roads || [], processedRoads, 'road');
            addConnection(tile.rivers || [], processedRivers, 'river');
        });

        // 5. ViewBox
        const centerPx = points.find(p => p.tile.id === centerTileId) || points[0];
        const VIEW_SIZE = 200;
        const uniqueBiomes = Array.from(new Set(tiles.map(t => t.biome)));

        return {
            renderTiles: processedTiles,
            roads: processedRoads,
            rivers: processedRivers,
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
                    {activeBiomes.map(biome => {
                        const textureUrl = BIOME_TEXTURES[biome];
                        if (!textureUrl) return null;
                        return (
                            <pattern key={biome} id={`pat-${biome}`} patternUnits="userSpaceOnUse" width="64" height="64">
                                <image href={textureUrl} x="0" y="0" width="64" height="64" preserveAspectRatio="xMidYMid slice" />
                            </pattern>
                        );
                    })}
                </defs>

                {/* 1. DRAW TILES (Ground Layer) */}
                {renderTiles.map(tile => {
                    const isCenter = tile.id === centerTileId;
                    const hasTexture = BIOME_TEXTURES[tile.biome];
                    const fill = hasTexture ? `url(#pat-${tile.biome})` : getBiomeColor(tile.biome);

                    return (
                        <path
                            key={`tile-${tile.id}`}
                            d={tile.path}
                            fill={fill}
                            stroke={'rgba(0,0,0,0.15)'}
                            strokeWidth={isCenter ? 3 : 1}
                            onMouseEnter={() => setTooltip({ x: tile.x, y: tile.y, tile })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        />
                    );
                })}

                {/* 2. DRAW RIVERS (Above ground) */}
                {rivers.map((river, i) => (
                    <line
                        key={`riv-${i}`}
                        x1={river.x1} y1={river.y1}
                        x2={river.x2} y2={river.y2}
                        stroke={river.style.color}
                        strokeWidth={river.style.width}
                        strokeLinecap="round"
                        opacity={0.8}
                        style={{ pointerEvents: 'none' }}
                    />
                ))}

                {/* 3. DRAW ROADS (Above Rivers) */}
                {roads.map((road, i) => (
                    <line
                        key={`rd-${i}`}
                        x1={road.x1} y1={road.y1}
                        x2={road.x2} y2={road.y2}
                        stroke={road.style.color}
                        strokeWidth={road.style.width}
                        strokeDasharray={road.style.dash}
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none', filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}
                    />
                ))}

                {/* 4. DRAW ICONS (Top Layer) */}
                {renderTiles.map(tile => {
                    const settlement = settlements.find(s => s.tile_id === tile.id);
                    const caravan = caravans.find(c => c.tile_id === tile.id);

                    if (!settlement && !caravan) return null;

                    return (
                        <g key={`icon-${tile.id}`} style={{ pointerEvents: 'none' }}>
                            {settlement && (
                                <image
                                    href={HomeSvg}
                                    x="-5" y="-4"
                                    width="10" height="8"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            )}
                            {caravan && !settlement && (
                                <text x={tile.x} y={tile.y + 5} fontSize={14} textAnchor="middle" style={{ textShadow: '0 1px 4px black' }}>
                                    🐫
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '10px', transform: 'translateX(-50%)',
                    background: 'rgba(20, 25, 35, 0.95)', border: '1px solid #555',
                    padding: '8px 12px', borderRadius: '6px', color: '#eee',
                    pointerEvents: 'none', fontSize: '0.8rem', zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.6)', textAlign: 'center', minWidth: '160px'
                }}>
                    <div style={{ color: '#69db7c', fontWeight: 'bold', marginBottom: '4px' }}>
                        {tooltip.tile.biome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                        Ele: {tooltip.tile.elevation}m • Temp: {tooltip.tile.temperature.toFixed(1)}°C
                    </div>
                    {/* Road/River Info in Tooltip */}
                    {(tooltip.tile.roads?.length || 0) > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#ccc', marginTop: '2px' }}>
                            🛣️ {tooltip.tile.roads?.length} Roads
                        </div>
                    )}
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