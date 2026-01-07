import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Delaunay } from 'd3-delaunay';
import HomeSvg from '../../../assets/map/home.svg';
import { WorldTile, WorldSettlement } from '../../../types/worldTypes';
import { BIOME_TEXTURES, getBiomeColor } from './BiomeAssets';
import { Caravan, CaravanPathData } from '@/types';

interface WorldMap2DProps {
    tiles: WorldTile[];
    settlements: WorldSettlement[];
    caravans: Caravan[];
    centerTileId: number;
    factionIcons: Record<number, string>;
    caravanPaths: Record<number, CaravanPathData>;
}

// --- STYLES & HELPERS ---
const getRoadStyle = (defName: string) => {
    switch (defName) {
        case 'AncientAsphaltRoad': return { color: '#333', width: 4, dash: '' };
        case 'AncientAsphaltHighway': return { color: '#222', width: 5, dash: '' };
        case 'StoneRoad': return { color: 'rgba(95, 110, 122, 1)', width: 3, dash: '' };
        case 'DirtRoad': return { color: 'rgba(139, 97, 55, 1)', width: 3, dash: '4,2' };
        default: return { color: 'rgba(167, 87, 7, 1)', width: 1, dash: '2,2' };
    }
};

const getRiverStyle = (defName: string) => {
    switch (defName) {
        case 'HugeRiver': return { width: 6, color: '#4fc3f7' };
        case 'LargeRiver': return { width: 4.5, color: '#4fc3f7' };
        case 'River': return { width: 3, color: '#38afe6ff' };
        case 'Creek': return { width: 1.5, color: '#65c2eeff' };
        default: return { width: 1, color: '#e1f5fe' };
    }
};

const isWaterBiome = (biome?: string) => biome === 'Ocean' || biome === 'DeepOcean';

const getElevationOverlay = (elevation: number) => {
    const NEUTRAL_LOW = 0;
    const NEUTRAL_HIGH = 400;

    if (elevation < NEUTRAL_LOW) {
        const intensity = Math.min(0.5, Math.abs(elevation) / 1200);
        return { color: '#0000002a', opacity: intensity };
    } else if (elevation > NEUTRAL_HIGH) {
        const intensity = Math.min(0.4, (elevation - NEUTRAL_HIGH) / 2000);
        return { color: '#ffffff31', opacity: intensity };
    }
    return { color: 'transparent', opacity: 0 };
};

// --- OPTIMIZED CHILD COMPONENT ---
const WorldMapContent = React.memo(({
    tiles,
    settlementMap,
    caravans, // Passed raw array for Paths/Labels
    caravanMap, // Passed Map for Icons (O(1) lookup)
    centerTileId,
    factionIcons,
    caravanPaths,
    onHover
}: {
    tiles: WorldTile[];
    settlementMap: Map<number, WorldSettlement>;
    caravans: Caravan[];
    caravanMap: Map<number, Caravan>;
    centerTileId: number;
    factionIcons: Record<number, string>;
    caravanPaths: Record<number, CaravanPathData>;
    onHover: (data: { x: number, y: number, tile: WorldTile } | null) => void;
}) => {
    const { renderTiles, roads, rivers, vbX, vbY, vbWidth, vbHeight, activeBiomes, tileLookup } = useMemo(() => {
        if (tiles.length === 0) return { renderTiles: [], roads: [], rivers: [], vbX: 0, vbY: 0, vbWidth: 100, vbHeight: 100, activeBiomes: [], tileLookup: new Map() };

        const centerTile = tiles.find(t => t.id === centerTileId) || tiles[0];
        const cLat = centerTile.lat;
        const cLon = centerTile.lon;
        const D2R = Math.PI / 180;
        const GLOBAL_SCALE = 60;
        const latCorrection = Math.cos(cLat * D2R);

        const points = tiles.map(tile => {
            const dLat = tile.lat - cLat;
            const dLon = tile.lon - cLon;
            const x = dLon * latCorrection * GLOBAL_SCALE;
            const y = -dLat * GLOBAL_SCALE;
            return { x, y, tile };
        });

        const pointList = points.map(p => [p.x, p.y] as [number, number]);
        const delaunay = Delaunay.from(pointList);
        const bounds = [-10000, -10000, 10000, 10000];
        const voronoi = delaunay.voronoi(bounds as [number, number, number, number]);

        const tileLookup = new Map<number, { x: number, y: number }>();
        const biomeLookup = new Map<number, string>();

        const processedTiles = points.map((p, i) => {
            tileLookup.set(p.tile.id, { x: p.x, y: p.y });
            biomeLookup.set(p.tile.id, p.tile.biome);
            return {
                ...p.tile,
                x: p.x,
                y: p.y,
                path: voronoi.renderCell(i)
            };
        });

        const processedRoads: any[] = [];
        const processedRivers: any[] = [];
        const processedConnections = new Set<string>();

        processedTiles.forEach(tile => {
            const addConnection = (list: string[], targetArray: any[], type: 'road' | 'river') => {
                if (!list) return;
                list.forEach(entry => {
                    const [neighborIdStr, defName] = entry.split(':');
                    const neighborId = parseInt(neighborIdStr);
                    const neighborPos = tileLookup.get(neighborId);

                    if (!neighborPos) return;

                    if (type === 'river') {
                        const neighborBiome = biomeLookup.get(neighborId);
                        if (isWaterBiome(tile.biome) || isWaterBiome(neighborBiome)) return;
                    }

                    const key = tile.id < neighborId ? `${tile.id}-${neighborId}-${defName}` : `${neighborId}-${tile.id}-${defName}`;
                    if (processedConnections.has(key)) return;
                    processedConnections.add(key);

                    targetArray.push({
                        x1: tile.x, y1: tile.y, x2: neighborPos.x, y2: neighborPos.y,
                        defName, style: type === 'road' ? getRoadStyle(defName) : getRiverStyle(defName)
                    });
                });
            };
            addConnection(tile.roads || [], processedRoads, 'road');
            addConnection(tile.rivers || [], processedRivers, 'river');
        });

        const centerPx = tileLookup.get(centerTileId) || points[0];
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
            activeBiomes: uniqueBiomes,
            tileLookup
        };

    }, [tiles, centerTileId]);

    // FIX: Iterate 'caravans' array directly. Using Map caused key confusion (TileID vs CaravanID).
    const destinationGroups = useMemo(() => {
        const groups = new Map<number, number[]>();
        caravans.forEach(c => {
            const path = caravanPaths[c.id]; // Access by correct Caravan ID
            if (path && path.moving && path.destination_tile && path.path && path.path.length > 0) {
                if (!groups.has(path.destination_tile)) groups.set(path.destination_tile, []);
                groups.get(path.destination_tile)!.push(c.id);
            }
        });
        return groups;
    }, [caravans, caravanPaths]);

    return (
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
                <path id="shape-SmallHills" d="M0,0 L-4,6 L4,6 Z" fill="#666" stroke="#444" strokeWidth="0.5" />
                <path id="shape-LargeHills" d="M0,-2 L-6,8 L6,8 Z M-4,2 L-8,8 L0,8 Z" fill="#555" stroke="#333" strokeWidth="0.5" />
                <path id="shape-Mountainous" d="M0,-5 L-7,8 L7,8 Z M-5,0 L-10,8 L0,8 Z M5,1 L0,8 L10,8 Z" fill="#444" stroke="#222" strokeWidth="0.5" />
                <path id="shape-Impassable" d="M0,-6 L-8,8 L8,8 Z M-4,-2 L-10,8 L2,8 Z M4,-1 L-2,8 L10,8 Z" fill="#333" stroke="#111" strokeWidth="0.5" />
            </defs>

            {/* 1. TILES */}
            {renderTiles.map(tile => {
                const hasTexture = BIOME_TEXTURES[tile.biome];
                const fill = hasTexture ? `url(#pat-${tile.biome})` : getBiomeColor(tile.biome);
                const overlay = getElevationOverlay(tile.elevation);

                return (
                    <g key={`tile-group-${tile.id}`}
                        onMouseEnter={() => onHover({ x: tile.x, y: tile.y, tile })}
                        onMouseLeave={() => onHover(null)}
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                    >
                        <path d={tile.path} fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
                        {overlay.opacity > 0 && <path d={tile.path} fill={overlay.color} opacity={overlay.opacity} style={{ pointerEvents: 'none' }} />}
                    </g>
                );
            })}

            {/* 2. RIVERS */}
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

            {/* 3. ROADS */}
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

            {/* 4. HILLS */}
            {renderTiles.map(tile => {
                if (isWaterBiome(tile.biome)) return null;
                let shapeId = null;
                if (tile.hilliness === 'SmallHills') shapeId = '#shape-SmallHills';
                else if (tile.hilliness === 'LargeHills') shapeId = '#shape-LargeHills';
                else if (tile.hilliness === 'Mountainous') shapeId = '#shape-Mountainous';
                else if (tile.hilliness === 'Impassable') shapeId = '#shape-Impassable';
                if (!shapeId) return null;
                return <use key={`hill-${tile.id}`} href={shapeId} x={tile.x} y={tile.y} style={{ pointerEvents: 'none', filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }} />;
            })}

            {/* 5. ICONS (Using Map for fast lookup by TileID) */}
            {renderTiles.map(tile => {
                const settlement = settlementMap.get(tile.id);
                const caravan = caravanMap.get(tile.id);

                if (!settlement && !caravan) return null;

                return (
                    <g key={`icon-${tile.id}`} style={{ pointerEvents: 'none' }}>
                        {settlement && (() => {
                            const iconUrl = factionIcons[settlement.faction.load_id];
                            const yOffset = caravan ? -8 : -4;
                            return (
                                <>
                                    {iconUrl ? (
                                        <image href={iconUrl} x={tile.x - 8} y={tile.y + yOffset - 4} width="16" height="16" preserveAspectRatio="xMidYMid slice" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }} />
                                    ) : (
                                        settlement.faction.is_player ? (
                                            <image href={HomeSvg} x={tile.x - 5} y={tile.y + yOffset} width="10" height="8" preserveAspectRatio="xMidYMid slice" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                        ) : (
                                            <text x={tile.x} y={tile.y + yOffset + 9} fontSize={14} textAnchor="middle" style={{ textShadow: '0 1px 4px black' }}>🛖</text>
                                        )
                                    )}
                                </>
                            );
                        })()}
                        {caravan && (
                            <text x={tile.x} y={tile.y + (settlement ? 12 : 5)} fontSize={14} textAnchor="middle" style={{ textShadow: '0 1px 4px black', filter: 'drop-shadow(0 0 2px gold)' }}>🐫</text>
                        )}
                    </g>
                );
            })}

            {/* 6. CARAVANS (Using Array iteration to ensure no ID loss) */}
            {caravans.map(c => {
                const pathData = caravanPaths[c.id];
                const startNode = tileLookup?.get(pathData ? pathData.current_tile : c.tile_id);

                if (!startNode) return null;

                let renderX = startNode.x;
                let renderY = startNode.y;

                if (pathData && pathData.moving && pathData.next_tile) {
                    const nextNode = tileLookup?.get(pathData.next_tile);
                    if (nextNode && pathData.next_tile !== pathData.current_tile) {
                        renderX = startNode.x + (nextNode.x - startNode.x) * pathData.progress;
                        renderY = startNode.y + (nextNode.y - startNode.y) * pathData.progress;
                    }
                }

                const isAtSettlement = settlementMap.has(pathData ? pathData.current_tile : c.tile_id);
                const shouldOffset = isAtSettlement && (!pathData || !pathData.moving || pathData.progress < 0.1);
                const yOffset = shouldOffset ? 8 : 0;

                return (
                    <g key={`caravan-${c.id}`} style={{ pointerEvents: 'none', transition: 'all 0.2s linear' }}>
                        {pathData && pathData.path && pathData.path.length > 0 && (() => {
                            let startIndex = pathData.path.indexOf(pathData.next_tile);
                            if (startIndex === -1) startIndex = 0;
                            const pointsToDraw: { x: number, y: number }[] = [];
                            pointsToDraw.push({ x: renderX, y: renderY + yOffset });
                            for (let i = startIndex; i < pathData.path.length; i++) {
                                const pos = tileLookup?.get(pathData.path[i]);
                                if (pos) pointsToDraw.push(pos);
                                else break;
                            }
                            if (pointsToDraw.length > 1) {
                                const pathString = pointsToDraw.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                return <path d={pathString} fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,1))' }} />;
                            }
                            return null;
                        })()}
                        <circle cx={renderX} cy={renderY + yOffset} r={4.5} fill="#ffd43b" stroke="#111" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                    </g>
                );
            })}

            {/* 7. DESTINATION LABELS */}
            {Array.from(destinationGroups.entries()).map(([destId, caravanIds]) => {
                const destPos = tileLookup?.get(destId);
                if (!destPos) return null;

                const ROW_HEIGHT = 12;
                const BOX_PADDING = 4;
                const BOX_WIDTH = 60;
                const boxHeight = (caravanIds.length * ROW_HEIGHT) + (BOX_PADDING * 2);
                const boxX = destPos.x - (BOX_WIDTH / 2);
                const boxY = destPos.y - boxHeight - 8;

                return (
                    <g key={`dest-label-${destId}`} style={{ pointerEvents: 'none' }}>
                        <path d={`M${destPos.x},${destPos.y - 2} L${destPos.x - 4},${destPos.y - 8} L${destPos.x + 4},${destPos.y - 8} Z`} fill="rgba(0, 0, 0, 0.8)" />
                        <rect x={boxX} y={boxY} width={BOX_WIDTH} height={boxHeight} rx="4" fill="rgba(0, 0, 0, 0.85)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />

                        {caravanIds.map((cId, index) => {
                            const path = caravanPaths[cId];
                            const caravan = caravans.find(c => c.id === cId);

                            if (!path || !path.path) return null;

                            // UPDATED LOGIC: Use 'days_to_arrive' from API
                            const days = caravan?.days_to_arrive ?? 0;
                            // Format to 1 decimal place (e.g. "1.5 days")
                            const labelText = `${days.toFixed(1)} days`;

                            return (
                                <text key={`txt-${cId}`} x={destPos.x} y={boxY + BOX_PADDING + (index * ROW_HEIGHT) + 10} fill="#ddd" fontSize="10" textAnchor="middle" fontFamily="sans-serif">
                                    {caravanIds.length > 1 ? `C${cId}: ${labelText}` : labelText}
                                </text>
                            );
                        })}
                    </g>
                );
            })}
        </svg>
    );
});

// --- MAIN PARENT COMPONENT ---
const WorldMap2D: React.FC<WorldMap2DProps> = ({ tiles, settlements, caravans, centerTileId, factionIcons, caravanPaths }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, tile: WorldTile } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const settlementMap = useMemo(() => {
        const map = new Map<number, WorldSettlement>();
        settlements.forEach(s => map.set(s.tile_id, s));
        return map;
    }, [settlements]);

    const caravanMap = useMemo(() => {
        const map = new Map<number, Caravan>();
        caravans.forEach(c => map.set(c.tile_id, c));
        return map;
    }, [caravans]);

    const handleHover = useCallback((data: { x: number, y: number, tile: WorldTile } | null) => {
        setTooltip(data);
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#0d1117' }}>
            <WorldMapContent
                tiles={tiles}
                settlementMap={settlementMap}
                caravans={caravans} // Pass the array explicitly for iteration logic
                caravanMap={caravanMap} // Pass the map for lookup logic
                centerTileId={centerTileId}
                factionIcons={factionIcons}
                caravanPaths={caravanPaths}
                onHover={handleHover}
            />

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
                        Ele: {tooltip.tile.elevation}m • {tooltip.tile.hilliness}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                        Temp: {tooltip.tile.temperature.toFixed(1)}°C
                    </div>
                    {(tooltip.tile.roads?.length || 0) > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#ccc', marginTop: '2px' }}>
                            🛣️ {tooltip.tile.roads?.length} Roads
                        </div>
                    )}
                    {settlementMap.has(tooltip.tile.id) && (() => {
                        const s = settlementMap.get(tooltip.tile.id)!;
                        const isPlayer = s.faction.is_player;
                        const factionColor = isPlayer ? '#ffd43b' : '#ff6b6b';
                        return (
                            <div style={{ color: factionColor, marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px' }}>
                                <strong>{s.name}</strong>
                                <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                    {s.faction.name}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default WorldMap2D;