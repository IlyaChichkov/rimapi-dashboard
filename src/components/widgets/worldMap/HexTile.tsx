import React, { useRef, useState } from 'react';
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

    // --- COORDINATE MAPPING ---
    // We map Lat/Lon to a 2D plane (X, Z) relative to the center tile.
    // 1 deg Lat approx 1.0 unit. 1 deg Lon approx 1.0 unit * cos(lat).
    const latDiff = tile.lat - centerLat;
    const lonDiff = tile.lon - centerLon;

    // Hex grid offset logic (every other row is offset) is complex with pure Lat/Lon.
    // However, RimWorld's lat/lon is spherical. For a small patch, a simple projection works well enough visually.
    const x = lonDiff * 1.5;
    const z = -latDiff * 1.5;

    const height = getElevationHeight(tile.elevation);
    const color = getBiomeColor(tile.biome);

    return (
        <group position={[x, height / 2, z]}>
            <Cylinder
                args={[0.6, 0.6, height, 6]} // TopRadius, BottomRadius, Height, RadialSegments (6 = Hexagon)
                onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHover(tile, new THREE.Vector3(x, height, z));
                }}
                onPointerOut={(e) => {
                    setHovered(false);
                    onHover(null);
                }}
            >
                <meshStandardMaterial
                    color={hovered ? '#ff4081' : color}
                    roughness={0.8}
                />
            </Cylinder>

            {/* Mountain Snow Cap logic */}
            {tile.elevation > 1200 && (
                <Cylinder args={[0.3, 0.5, 0.2, 6]} position={[0, height / 2 + 0.1, 0]}>
                    <meshStandardMaterial color="#fff" />
                </Cylinder>
            )}
        </group>
    );
};

export default HexTile;