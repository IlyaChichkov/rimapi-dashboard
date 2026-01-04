import React, { useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Cylinder } from '@react-three/drei';
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
        // 1. Convert to Relative Coordinates
        // We multiply by a small factor if we want to "spread" them visually, 
        // but standard math usually looks best if the tile size is correct.
        const latRad = (tile.lat - centerLat) * (Math.PI / 180);
        const lonRad = (tile.lon - centerLon) * (Math.PI / 180);

        // 2. Spherical Coordinate Math
        // Standard mapping: Y is Up (North), Z is Forward, X is Right
        // x = R * cos(lat) * sin(lon)
        // y = R * sin(lat)
        // z = R * cos(lat) * cos(lon)
        const x = PLANET_RADIUS * Math.cos(latRad) * Math.sin(lonRad);
        const y = PLANET_RADIUS * Math.sin(latRad);
        const z = PLANET_RADIUS * Math.cos(latRad) * Math.cos(lonRad);

        const pos = new THREE.Vector3(x, y, z);

        // 3. Calculate Rotation
        const dummy = new THREE.Object3D();
        dummy.position.copy(pos);
        dummy.lookAt(0, 0, 0); // Face the core

        // Adjust for Cylinder orientation
        dummy.rotateX(Math.PI / 2);
        dummy.rotateY(Math.PI / 6); // Pointy top alignment

        return { position: pos, rotation: dummy.rotation };
    }, [tile.lat, tile.lon, centerLat, centerLon]);

    // Visual Height logic
    const baseHeight = 0.4;
    const elevationScale = getElevationHeight(tile.elevation) * 0.5;
    const totalHeight = baseHeight + elevationScale;

    const color = getBiomeColor(tile.biome);

    return (
        <group position={position} rotation={rotation}>
            <Cylinder
                // --- FIX: Reduced Radius from 0.95 to 0.65 to fix overlap ---
                args={[0.295, 0.295, totalHeight, 6]}
                position={[0, totalHeight / 2, 0]}
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
                    roughness={0.7}
                    flatShading={true}
                />
            </Cylinder>

            {/* Snow Cap */}
            {tile.elevation > 1200 && (
                <Cylinder
                    args={[0.35, 0.5, 0.1, 6]} // Scaled down cap too
                    position={[0, totalHeight + 0.05, 0]}
                >
                    <meshBasicMaterial color="#ffffff" />
                </Cylinder>
            )}
        </group>
    );
};

export default HexTile;