// src/services/rimworldApi.ts
import { WorldCaravan, WorldSettlement, WorldTile } from "@/types/worldTypes";
import {
  RimWorldData,
  GameState,
  Colonist,
  ResourceSummary,
  CreaturesSummary,
  PowerInfo,
  DatetimeCategory,
  WeatherCategory,
  ResearchProgress,
  ResearchFinished,
  ResearchSummary,
  ColonistDetailed,
  ModInfo,
  ItemImageResponse,
  ResourcesData,
  Position,
  Faction,
  PlayerFaction,
  FactionRelations,
  Caravan,
} from "../types";

// ---------------------------------------------------------------------------
// CONFIGURATION & TYPES
// ---------------------------------------------------------------------------

let API_BASE_URL = "http://localhost:8765/api/v1";

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url.replace(/\/+$/, "");
};

export const getApiBaseUrl = () => API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// CORE NETWORK CLIENT
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Core wrapper for fetch operations with timeout and typed responses.
 */
async function coreRequest<T>(
  endpoint: string,
  config: RequestInit = {},
  shouldThrowOnError: boolean = false
): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      mode: "cors",
      signal: controller.signal,
      ...config,
      headers: {
        ...(config.body && typeof config.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...config.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `HTTP ${res.status} ${res.statusText} - ${text || "No body"}`;
      if (shouldThrowOnError) throw new Error(msg);
      console.error(msg);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const response: ApiResponse<T> = await res.json();
      
      if (!response.success) {
        const errorMsg = response.errors?.join(", ") || "API request failed";
        if (shouldThrowOnError) throw new Error(errorMsg);
        console.error(errorMsg);
        return null;
      }
      return response.data;
    }
    
    // For non-JSON successful responses (rare in this API)
    return null;
  } catch (err) {
    if (shouldThrowOnError) throw err;
    console.error("Network Error:", err);
    return null;
  } finally {
    clearTimeout(id);
  }
}

// -- Helpers --
const getJson = <T>(endpoint: string) => coreRequest<T>(endpoint);

const postNoBody = (endpoint: string) => 
  coreRequest<void>(endpoint, { method: "POST" });

const postJson = async <T>(endpoint: string, body: any): Promise<T> => {
  // We enable throwOnError to match original code behavior for POSTs
  const res = await coreRequest<T>(endpoint, { 
    method: "POST", 
    body: JSON.stringify(body) 
  }, true);
  return res as T; 
};

// ---------------------------------------------------------------------------
// DATA VALIDATORS / ADAPTERS
// ---------------------------------------------------------------------------

const ensureArray = <T>(val: unknown): T[] => (Array.isArray(val) ? (val as T[]) : []);

const validateGameState = (d: any): any => ({
  game_time: d?.game_time ?? "Unknown",
  time_speed: d?.time_speed ?? "Unknown",
  weather: d?.weather ?? "Unknown",
  temperature: d?.temperature ?? 0,
  storyteller: d?.storyteller ?? "Unknown",
  difficulty: d?.difficulty ?? "Unknown",
  program_state: d?.program_state ?? "Unknown",
  colonist_count: d?.colonist_count ?? 0,
});

const validateColonists = (data: unknown): Colonist[] => 
  ensureArray<Colonist>(data).filter((c: any) => c && c.id);

const validateColonistsDetailed = (data: unknown): ColonistDetailed[] => 
  ensureArray<ColonistDetailed>(data).filter((c: any) => c?.colonist && c?.colonist_medical_info);

const validateModsInfo = (data: unknown): ModInfo[] => 
  ensureArray<ModInfo>(data).filter((m: any) => m?.name && m?.package_id);

const validateResources = (d: any): ResourceSummary => ({
  total_items: d?.total_items ?? d?.totalItems ?? 0,
  total_market_value: d?.total_market_value ?? d?.totalMarketValue ?? 0,
  categories: ensureArray<any>(d?.categories).map((c) => ({
    category: c.category,
    count: c.count ?? 0,
    market_value: c.market_value ?? c.marketValue ?? 0,
  })),
});

const validateCreatures = (d: any): CreaturesSummary => ({
  colonists_count: d?.colonists_count ?? d?.colonistsCount ?? 0,
  prisoners_count: d?.prisoners_count ?? d?.prisonersCount ?? 0,
  enemies_count: d?.enemies_count ?? d?.enemiesCount ?? 0,
  animals_count: d?.animals_count ?? d?.animalsCount ?? 0,
  insectoids_count: d?.insectoids_count ?? d?.insectoidsCount ?? 0,
  mechanoids_count: d?.mechanoids_count ?? d?.mechanoidsCount ?? 0,
});

const validatePower = (d: any): PowerInfo => ({
  current_power: d?.current_power ?? 0,
  total_possible_power: d?.total_possible_power ?? 0,
  currently_stored_power: d?.currently_stored_power ?? 0,
  total_power_storage: d?.total_power_storage ?? 0,
  total_consumption: d?.total_consumption ?? 0,
  consumption_power_on: d?.consumption_power_on ?? 0,
});

const validateResearchSummary = (d: any): ResearchSummary => ({
  finished_projects_count: d?.finished_projects_count ?? 0,
  total_projects_count: d?.total_projects_count ?? 0,
  available_projects_count: d?.available_projects_count ?? 0,
  by_tech_level: d?.by_tech_level ?? {},
  by_tab: d?.by_tab ?? {},
});

const validateResearchProgress = (d: any): ResearchProgress => {
  if (!d) return {
      name: "None", label: "None", progress: 0, research_points: 0,
      description: "No active research", is_finished: false, can_start_now: false,
      player_has_any_appropriate_research_bench: false, required_analyzed_thing_count: 0,
      analyzed_things_completed: 0, tech_level: "Unknown", prerequisites: [],
      hidden_prerequisites: [], required_by_this: [], progress_percent: 0,
  };
  return {
    name: d.name ?? "None",
    label: d.label ?? "None",
    progress: d.progress ?? 0,
    research_points: d.research_points ?? 0,
    description: d.description ?? "No description available",
    is_finished: Boolean(d.is_finished),
    can_start_now: Boolean(d.can_start_now),
    player_has_any_appropriate_research_bench: Boolean(d.player_has_any_appropriate_research_bench),
    required_analyzed_thing_count: d.required_analyzed_thing_count ?? 0,
    analyzed_things_completed: d.analyzed_things_completed ?? 0,
    tech_level: d.tech_level ?? "Unknown",
    prerequisites: d.prerequisites ?? [],
    hidden_prerequisites: d.hidden_prerequisites ?? [],
    required_by_this: d.required_by_this ?? [],
    progress_percent: d.progress_percent ?? 0,
  };
};

const validateResearchFinished = (d: any): ResearchFinished => ({ 
  finished_projects: d?.finished_projects ?? [] 
});

// ---------------------------------------------------------------------------
// UTILITIES (File Uploads, etc)
// ---------------------------------------------------------------------------

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const result = String(fr.result || '');
      const i = result.indexOf('base64,');
      resolve(i >= 0 ? result.slice(i + 'base64,'.length) : result);
    };
    fr.readAsDataURL(file);
  });
}

/**
 * Uploads a file as an item texture, handling conversion to base64 and API parameters.
 */
async function uploadItemTextureFile(
  itemName: string,
  file: File,
  opts?: {
    kind: string,
    imageIndex: string,
    direction: string | undefined,
    onProgress?: (percent: number, sent: number, total: number, idx: number) => void;
  }
) {
  const base64 = await fileToBase64(file);
  const total = base64.length;
  const direction = opts?.direction === undefined ? "all" : opts?.direction; 

  // Note: The original implementation supported chunks in a helper function but called
  // a 'fire-and-forget' single postJson here. We maintain that logic.
  await postJson('/item/image', {
    name: itemName,
    image: base64,
    direction: direction,
    thing_type: opts?.kind,
    update_item_index: opts?.imageIndex,
  });

  opts?.onProgress?.(100, total, total, 1);
}

// ---------------------------------------------------------------------------
// COMPOSITE ACTIONS (Macros)
// ---------------------------------------------------------------------------

export const selectItem = async (itemId: number, position: Position): Promise<void> => {
  try {
    await postNoBody(`/deselect?type=all`);
    await postNoBody(`/select?type=item&id=${itemId}`);
    // RimWorld uses X/Z plane; API expects x & y where y is Z.
    await postNoBody(`/camera/change/position?x=${position.x}&y=${position.z}`);
    await postNoBody(`/camera/change/zoom?zoom=18`);
  } catch (err) {
    console.error("Failed to select item:", err);
    throw err;
  }
};

export const selectAndViewColonist = async (colonistId: number, _colonistName: string): Promise<void> => {
  try {
    const data = await getJson<{ position?: { x: number; y: number; z: number } }>(
      `/colonist?id=${colonistId}&fields=position`
    );

    if (!data?.position) throw new Error("Failed to get colonist position");

    await postNoBody(`/deselect?type=all`);
    await postNoBody(`/select?type=pawn&id=${colonistId}`);
    await postNoBody(`/camera/change/zoom?zoom=14`);
    await postNoBody(`/camera/change/position?x=${data.position.x}&y=${data.position.z}`);
    await postNoBody(`/open-tab?type=health`);
  } catch (err) {
    console.error("Failed to navigate to colonist:", err);
    throw err;
  }
};

// ---------------------------------------------------------------------------
// MAIN AGGREGATOR
// ---------------------------------------------------------------------------

export const fetchRimWorldData = async (): Promise<RimWorldData> => {
  const ts = Date.now();

  const [
    gameState,
    colonists,
    colonistsDetailed,
    resources,
    creatures,
    power,
    map_datetime,
    weather,
    researchProgress,
    researchFinished,
    researchSummary,
    modsInfo,
  ] = await Promise.all([
    getJson<GameState>("/game/state"),
    getJson<Colonist[]>("/colonists?fields=id,name,gender,age,health,mood"),
    getJson<ColonistDetailed[]>("/colonists/detailed"),
    getJson<ResourceSummary>("/resources/summary?map_id=0"),
    getJson<CreaturesSummary>("/map/creatures/summary?map_id=0"),
    getJson<PowerInfo>(`/map/power/info?map_id=0&_=${ts}`),
    getJson<DatetimeCategory>("/datetime?at=current_map"),
    getJson<WeatherCategory>("/map/weather?map_id=0"),
    getJson<ResearchProgress>("/research/progress"),
    getJson<ResearchFinished>("/research/finished"),
    getJson<ResearchSummary>("/research/summary"),
    getJson<ModInfo[]>("/mods/info"),
  ]);

  return {
    gameState: validateGameState(gameState),
    colonists: (colonists || []) as Colonist[], // Simple pass-through per original logic
    colonistsDetailed: validateColonistsDetailed(colonistsDetailed),
    resources: validateResources(resources),
    creatures: validateCreatures(creatures),
    power: validatePower(power),
    map_datetime,
    weather,
    researchProgress: validateResearchProgress(researchProgress),
    researchFinished: validateResearchFinished(researchFinished),
    researchSummary: validateResearchSummary(researchSummary),
    modsInfo: validateModsInfo(modsInfo),
  };
};

// ---------------------------------------------------------------------------
// API EXPORT OBJECT
// ---------------------------------------------------------------------------

export const rimworldApi = {
  // --- Game State & System ---
  async fetchGameState(): Promise<any | null> {
    return getJson<any>('/game/state');
  },
  async startGame(): Promise<void> {
    await postNoBody('/game/start/devquick');
  },
  async loadGame(name: string): Promise<void> {
    await postNoBody(`/game/load?name=${encodeURIComponent(name)}`);
  },
  async fetchMaterialsAtlas(): Promise<{ materials: string[] }> {
    const data = await getJson<{ materials: string[] }>('/dev/materials-atlas');
    return data ?? { materials: [] };
  },
  async clearMaterialsAtlas(): Promise<void> {
    await postJson('/dev/materials-atlas/clear', {});
  },

  // --- Colonists ---
  async getPawns(): Promise<Colonist[]> {
    const response = await getJson<Colonist[]>("/colonists?fields=id,name,gender,age");
    return validateColonists(response);
  },
  async getPawnPortraitImage(pawnId: string): Promise<ItemImageResponse> {
    const data = await getJson<ItemImageResponse>(
      `/pawn/portrait/image?pawn_id=${encodeURIComponent(pawnId)}&width=64&height=64&direction=south`
    );
    return data as ItemImageResponse;
  },
  async setColonistWorkPriority(id: number, work: string, priority: number): Promise<void> {
    await postJson(`/colonist/work-priority`, { id, work, priority });
  },
  async setColonistsWorkPriorities(workPriorities: { id: number; work: string; priority: number }[]): Promise<void> {
    await postJson('/colonists/work-priority', workPriorities);
  },
  async fetchColonistInventory(colonistId: number) {
    const data = await getJson<{ items: any[] }>(`/colonist/inventory?id=${colonistId}`);
    return (data ?? { items: [] }).items;
  },
  async fetchWorkList(): Promise<{ work: string[] }> {
    const data = await getJson<{ work: string[] }>('/work-list');
    return data ?? { work: [] };
  },
  async assignItemToPawn(itemId: string, itemType: string, pawnId: string): Promise<{ success: boolean }> {
    const params = new URLSearchParams({ 
      item_type: itemType, 
      map_id: "0", 
      pawn_id: pawnId, 
      item_id: itemId 
    });
    await postNoBody(`/jobs/make/equip?${params.toString()}`);
    return { success: true };
  },

  // --- Items & Resources ---
  async getResourcesStored(mapId: number = 0): Promise<ResourcesData> {
    const data = await getJson<ResourcesData>(`/resources/stored?map_id=${mapId}`);
    return data as ResourcesData;
  },
  async getItemImage(defName: string): Promise<ItemImageResponse> {
    const data = await getJson<ItemImageResponse>(`/item/image?name=${encodeURIComponent(defName)}`);
    return data as ItemImageResponse;
  },
  // Placeholder logic
  async getItemDetails(_itemId: string, _pawnId: string): Promise<{ success: boolean }> {
    return { success: true };
  },
  async setStuffColor(name: string, hex: string): Promise<void> {
    await postJson('/stuff/color', { name, hex: hex.replace(/^#/, '') });
  },
  uploadItemTextureFile,

  // --- World & Factions ---
  async fetchPlayerFaction(): Promise<PlayerFaction | null> {
    return getJson<PlayerFaction>('/faction/player');
  },
  async fetchAllFactions(): Promise<Faction[] | null> {
    return getJson<Faction[]>('/factions');
  },
  async fetchFactionRelations(id: number): Promise<FactionRelations | null> {
    return getJson<FactionRelations>(`/faction/relations?id=${id}`);
  },
  async fetchCaravans(): Promise<Caravan[] | null> {
    return getJson<Caravan[]>(`/world/caravans`);
  },
  async getWorldPlayerSettlements(): Promise<WorldSettlement[] | null> {
    return getJson<WorldSettlement[]>('/world/player/settlements');
  },
  async getWorldSettlements(): Promise<WorldSettlement[] | null> {
    return getJson<WorldSettlement[]>('/world/settlements');
  },
  async getWorldCaravans(): Promise<WorldCaravan[] | null> {
    return getJson<WorldCaravan[]>('/world/caravans');
  },
  async getWorldGridArea(centerTileId: number, radius: number = 7): Promise<WorldTile[] | null> {
    return getJson<WorldTile[]>(`/world/grid/area?tile_id=${centerTileId}&radius=${radius}`);
  },

  // --- Research ---
  async fetchResearchProgress(): Promise<ResearchProgress | null> {
    return getJson<ResearchProgress>('/research/progress');
  },
};