export const getBiomeColor = (biome: string): string => {
    switch (biome) {
        case 'Ocean': return '#1a3c6e';
        case 'Lake': return '#265c9e';
        case 'IceSheet': return '#e3f2fd';
        case 'SeaIce': return '#bbdefb';
        case 'BorealForest': return '#2d4c2a';
        case 'Tundra': return '#a7b6a6';
        case 'TemperateForest': return '#4caf50';
        case 'TropicalRainforest': return '#1b5e20';
        case 'AridShrubland': return '#dcedc8';
        case 'Desert': return '#e6c288';
        case 'ExtremeDesert': return '#d7ccc8';
        default: return '#555'; // Unknown
    }
};

export const getElevationHeight = (elevation: number): number => {
    // Scale elevation for 3D visual pop
    if (elevation <= 0) return 0.1; // Water is flat
    return 0.1 + (elevation / 3000); // Mountains stick up
};