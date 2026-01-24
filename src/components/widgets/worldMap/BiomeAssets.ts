// src/widgets/WorldMap/BiomeAssets.ts

// 1. Import all images from the src/assets folder
// Note: The relative path "../../assets" assumes this file is in "src/widgets/WorldMap"
import OceanImg from '../../../assets/biomes/Ocean.png';
import TundraImg from '../../../assets/biomes/Tundra.png';
import IceSheetImg from '../../../assets/biomes/IceSheet.png';
import IceSheetOceanImg from '../../../assets/biomes/IceSheetOcean.png'; // Using this for SeaIce
import BorealForestImg from '../../../assets/biomes/BorealForest.png';
import TemperateForestImg from '../../../assets/biomes/TemperateForest.png';
import TropicalRainforestImg from '../../../assets/biomes/TropicalRainforest.png';
import AridShrublandImg from '../../../assets/biomes/AridShrubland.png';
import DesertImg from '../../../assets/biomes/Desert.png';
import ExtremeDesertImg from '../../../assets/biomes/ExtremeDesert.png';
import TemperateSwampImg from '../../../assets/biomes/TemperateSwamp.png';
import TropicalSwampImg from '../../../assets/biomes/TropicalSwamp.png';
import ColdBogImg from '../../../assets/biomes/ColdBog.png';

// 2. Map Biome Names to the Imported Image Objects
export const BIOME_TEXTURES: Record<string, string> = {
    // Exact Matches
    'Ocean': OceanImg,
    'Tundra': TundraImg,
    'IceSheet': IceSheetImg,
    'BorealForest': BorealForestImg,
    'TemperateForest': TemperateForestImg,
    'TropicalRainforest': TropicalRainforestImg,
    'AridShrubland': AridShrublandImg,
    'Desert': DesertImg,
    'ExtremeDesert': ExtremeDesertImg,
    'TemperateSwamp': TemperateSwampImg,
    'TropicalSwamp': TropicalSwampImg,
    'ColdBog': ColdBogImg,

    // Mappings for missing/alternate biomes
    'DeepOcean': OceanImg,       // Reuse Ocean
    'SeaIce': IceSheetOceanImg,  // Use the specific file you have
    'Lake': OceanImg,
    'Water': OceanImg,
};

export const getBiomeColor = (biome: string): string => {
    switch (biome) {
        case 'Ocean': return '#1a3c6e';
        case 'Tundra': return '#a7b6a6';
        case 'TemperateForest': return '#4caf50';
        case 'Desert': return '#e6c288';
        default: return '#555';
    }
};