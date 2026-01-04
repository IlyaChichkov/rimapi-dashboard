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

    // Find center coords for relative positioning
    const centerTile = tiles.find(t => t.id === centerTileId) || tiles[0];
    const centerLat = centerTile?.lat || 0;
    const centerLon = centerTile?.lon || 0;

    return (
        <Canvas camera={{ position: [0, 8, 8], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />

            <group>
                {tiles.map((tile) => (
                    <HexTile
                        key={tile.id}
                        tile={tile}
                        centerLat={centerLat}
                        centerLon={centerLon}
                        onHover={(t, pos) => {
                            if (t && pos) setTooltipData({ tile: t, pos });
                            else setTooltipData(null);
                        }}
                    />
                ))}

                {/* Settlement Markers would go here, calculating pos similarly to HexTile */}
            </group>

            {/* Tooltip Overlay */}
            {tooltipData && (
                <Html position={[tooltipData.pos.x, tooltipData.pos.y + 1, tooltipData.pos.z]}>
                    <div style={{
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        transform: 'translate3d(-50%, -100%, 0)'
                    }}>
                        <strong>{tooltipData.tile.biome}</strong><br />
                        {tooltipData.tile.elevation}m | {tooltipData.tile.temperature}°C<br />
                        {/* Find settlement on this tile */}
                        {settlements.find(s => s.tile === tooltipData.tile.id)?.name && (
                            <span style={{ color: '#4dabf7' }}>🏠 {settlements.find(s => s.tile === tooltipData.tile.id)?.name}</span>
                        )}
                    </div>
                </Html>
            )}

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                minDistance={5}
                maxDistance={20}
                maxPolarAngle={Math.PI / 2.2} // Don't allow going below ground
            />
        </Canvas>
    );
};

export default WorldScene;