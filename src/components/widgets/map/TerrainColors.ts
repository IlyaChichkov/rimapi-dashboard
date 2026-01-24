// src/features/dashboard/components/map/TerrainColors.ts

// rgba(255, 165, 0, 0.7)

export const ORE_COLORS: Record<string, [number, number, number]> = {
    'steel': [97, 151, 182],
    'silver': [220, 220, 220],
    'gold': [255, 215, 0],
    'plasteel': [100, 220, 255],
    'uranium': [50, 205, 50],
    'jade': [0, 168, 107],
    'components': [255, 165, 0],
    'components_industrial': [255, 165, 0],
    'machinery': [255, 140, 0],

    // --- ROUGH STONE ---
    'marble': [200, 200, 200],
    'sandstone': [120, 90, 80],
    'granite': [90, 80, 85],
    'limestone': [130, 130, 120],
    'slate': [60, 60, 65],
};

export const DEFAULT_COLOR: [number, number, number] = [100, 100, 100];

export const isOre = (defName: string): boolean => {
    const lower = defName.toLowerCase();
    return lower.startsWith('mineable') || defName.endsWith('_Rough');
};