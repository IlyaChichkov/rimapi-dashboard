// src/types/worldTypes.ts

export interface WorldTile {
    id: number;
    biome: string;
    elevation: number;
    temperature: number;
    rainfall: number;
    hilliness: string;
    lat: number;
    lon: number;
    is_polluted: boolean;
    pollution: number;
    roads?: string[];
    rivers?: string[];
}

export interface FactionInfo {
    load_id: number;
    def_name: string;
    name: string;
    is_player: boolean;
    leader_title: string;
    leader_id: number;
}

export interface WorldSettlement {
    id: number;
    name: string;
    tile_id: number;
    faction: FactionInfo;
}

export interface WorldCaravan {
    id: number;
    name: string;
    is_player_controlled: boolean;
    tile_id: number;
    pawns: { id: number; name: string }[];
}

export interface WorldGridAreaResponse {
    success: boolean;
    data: WorldTile[];
}