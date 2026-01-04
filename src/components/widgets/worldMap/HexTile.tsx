// src/widgets/WorldMap/HexTile.tsx
import React, { useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Circle } from '@react-three/drei';
import * as THREE from 'three';
import { WorldTile } from '../../../types/worldTypes';
import { getBiomeColor, getElevationHeight } from './BiomeColors';

interface HexTileProps {
    tile: WorldTile;
    onHover: (tile: WorldTile | null, position?: THREE.Vector3) => void;
    centerLat: number;
    centerLon: number;
}

const HexTile: React.FC<HexTileProps> = ({ tile, onHover, centerLat, centerLon }) => {
    const [hovered, setHovered] = useState(false);

    // --- SPHERICAL CONFIG ---
    const PLANET_RADIUS = 100;

    const { position, rotation } = useMemo(() => {
        const latRad = (tile.lat - centerLat) * (Math.PI / 180);
        const lonRad = (tile.lon - centerLon) * (Math.PI / 180);

        const x = PLANET_RADIUS * Math.cos(latRad) * Math.sin(lonRad);
        const y = PLANET_RADIUS * Math.sin(latRad);
        const z = PLANET_RADIUS * Math.cos(latRad) * Math.cos(lonRad);

        const pos = new THREE.Vector3(x, y, z);

        const dummy = new THREE.Object3D();
        dummy.position.copy(pos);
        dummy.lookAt(0, 0, 0);

        return { position: pos, rotation: dummy.rotation };
    }, [tile.lat, tile.lon, centerLat, centerLon]);

    // Elevation Offset logic
    const elevationOffset = getElevationHeight(tile.elevation) * 0.2;
    const color = getBiomeColor(tile.biome);

    return (
        <group position={position} rotation={rotation}>
            {/* CircleGeometry (2D Hexagon):
               - Default: Vertex at 0 deg (Right) -> Flat Top.
               - Fix: Rotation Z by 90 deg -> Vertex at 90 deg (Top) -> Pointy Top.
            */}
            <Circle
                args={[0.36, 6]}
                rotation={[0, 0, Math.PI / 2]} // <--- ROTATION FIX HERE
                position={[0, 0, -elevationOffset]}
                onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHover(tile, position);
                }}
                onPointerOut={() => {
                    setHovered(false);
                    onHover(null);
                }}
            >
                <meshStandardMaterial
                    color={hovered ? '#ff4081' : color}
                    roughness={0.8}
                    flatShading={false}
                    side={THREE.DoubleSide}
                />
            </Circle>

            {/* Snow Cap */}
            {tile.elevation > 1200 && (
                <Circle
                    args={[0.15, 6]}
                    rotation={[0, 0, Math.PI / 2]} // <--- ROTATION FIX HERE TOO
                    position={[0, 0, -(elevationOffset + 0.05)]}
                >
                    <meshBasicMaterial color="#ffffff" />
                </Circle>
            )}
        </group>
    );
};

export default HexTile;