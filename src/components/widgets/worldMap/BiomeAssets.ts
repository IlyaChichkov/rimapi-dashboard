// src/widgets/WorldMap/BiomeAssets.ts

// Map the RimWorld biome names (from API) to your image paths
export const BIOME_TEXTURES: Record<string, string> = {
    'Ocean': '/assets/biomes/ocean.png',
    'DeepOcean': '/assets/biomes/ocean_deep.png',
    'Tundra': '/assets/biomes/tundra.png',
    'IceSheet': '/assets/biomes/ice_sheet.png',
    'SeaIce': '/assets/biomes/sea_ice.png',
    'BorealForest': '/assets/biomes/boreal_forest.png',
    'TemperateForest': '/assets/biomes/temperate_forest.png',
    'TropicalRainforest': '/assets/biomes/tropical_rainforest.png',
    'AridShrubland': '/assets/biomes/arid_shrubland.png',
    'Desert': '/assets/biomes/desert.png',
    'ExtremeDesert': '/assets/biomes/extreme_desert.png',
    // Fallbacks
    'Lake': '/assets/biomes/ocean.png',
};

// Keep your color fallback just in case a texture fails to load or isn't defined
export const getBiomeColor = (biome: string): string => {
    switch (biome) {
        case 'Ocean': return '#1a3c6e';
        case 'Tundra': return '#a7b6a6';
        case 'TemperateForest': return '#4caf50';
        case 'Desert': return '#e6c288';
        default: return '#555';
    }
};