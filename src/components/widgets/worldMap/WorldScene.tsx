// src/widgets/WorldMap/WorldScene.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { WorldTile, WorldSettlement, WorldCaravan } from '../../../types/worldTypes';
import HexTile from './HexTile';
import * as THREE from 'three';

interface WorldSceneProps {
    tiles: WorldTile[];
    settlements: WorldSettlement[];
    caravans: WorldCaravan[];
    centerTileId: number;
}

const WorldScene: React.FC<WorldSceneProps> = ({ tiles, settlements, caravans, centerTileId }) => {
    const [tooltipData, setTooltipData] = React.useState<{ tile: WorldTile, pos: THREE.Vector3 } | null>(null);

    const centerTile = tiles.find(t => t.id === centerTileId) || tiles[0];
    const centerLat = centerTile?.lat || 0;
    const centerLon = centerTile?.lon || 0;

    return (
        <Canvas camera={{ position: [0, 0, 140], fov: 35, near: 0.1, far: 1000 }}>
            <color attach="background" args={['#0d1117']} />

            <ambientLight intensity={0.6} />
            <pointLight position={[50, 50, 150]} intensity={1} />

            {/* Render Tiles directly. They calculate their own sphere position relative to center */}
            {tiles.map((tile) => (
                <HexTile
                    key={tile.id}
                    tile={tile}
                    centerLat={centerLat}
                    centerLon={centerLon}
                    onHover={(t, pos) => {
                        // Pass simple position for tooltip. 
                        // Note: 'pos' here is on the sphere surface.
                        if (t && pos) setTooltipData({ tile: t, pos });
                        else setTooltipData(null);
                    }}
                />
            ))}

            {/* Tooltip Overlay */}
            {tooltipData && (
                <Html position={tooltipData.pos} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(20, 20, 30, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        // Shift tooltip up so it doesn't cover the tile
                        transform: 'translate3d(-50%, -150%, 0)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#a5d8ff' }}>
                            {tooltipData.tile.biome}
                        </div>
                        <div>Ele: {tooltipData.tile.elevation}m</div>
                        <div>Tmp: {tooltipData.tile.temperature.toFixed(1)}°C</div>

                        {settlements.find(s => s.tile_id === tooltipData.tile.id) && (
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#ffd43b' }}>
                                🏠 {settlements.find(s => s.tile_id === tooltipData.tile.id)?.name}
                            </div>
                        )}
                        {caravans.find(c => c.tile_id === tooltipData.tile.id) && (
                            <div style={{ marginTop: '2px', color: '#69db7c' }}>
                                🐫 {caravans.find(c => c.tile_id === tooltipData.tile.id)?.name}
                            </div>
                        )}
                    </div>
                </Html>
            )}

            <OrbitControls
                enableRotate={false}
                enableZoom={true}
                enablePan={true}
                minDistance={105} // Don't clip into surface (R=100)
                maxDistance={180}
            />
        </Canvas>
    );
};

export default WorldScene;