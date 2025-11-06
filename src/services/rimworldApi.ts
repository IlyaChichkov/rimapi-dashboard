// src/services/rimworldApi.ts
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
  ResourcesStoredResponse,
  ItemImageResponse,
  ResourcesData,
  Position,
} from "../types";

// -----------------------------
// Config
// -----------------------------
let API_BASE_URL = "http://localhost:8765/api/v1";

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url.replace(/\/+$/, ""); // trim trailing slash
};

export const getApiBaseUrl = () => API_BASE_URL;

// -----------------------------
// Fetch helpers
// -----------------------------
const DEFAULT_TIMEOUT_MS = 10_000;

const withTimeout = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
};

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const { signal, cancel } = withTimeout();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      // Don’t set Content-Type by default to avoid POST preflight.
      // Add only what you need explicitly via init.headers.
      mode: "cors",
      signal,
      ...init,
      headers: {
        ...(init.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text || "No body"}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }

    return undefined as T;
  } finally {
    cancel();
  }
}

const getJson = <T>(endpoint: string) => request<T>(endpoint);
const postNoBody = (endpoint: string) =>
  request<void>(endpoint, { method: "POST" });

// -----------------------------
// Validators / normalizers
// -----------------------------
const ensureArray = <T>(val: unknown): T[] => (Array.isArray(val) ? (val as T[]) : []);

const validateGameState = (data: unknown): GameState => {
  const d = (data ?? {}) as Record<string, any>;
  return {
    game_time: d.game_time ?? "Unknown",
    time_speed: d.time_speed ?? "Unknown",
    weather: d.weather ?? "Unknown",
    temperature: d.temperature ?? 0,
    storyteller: d.storyteller ?? "Unknown",
    difficulty: d.difficulty ?? "Unknown",
  };
};

const validateColonists = (data: unknown): Colonist[] => {
  const arr = ensureArray<Colonist>(data);
  return arr.filter((c: any) => c && c.id && c.name);
};

const validateColonistsDetailed = (data: unknown): ColonistDetailed[] => {
  const arr = ensureArray<ColonistDetailed>(data);
  return arr.filter((c: any) => c && c.colonist && c.colonist_medical_info);
};

const validateModsInfo = (data: unknown): ModInfo[] => {
  const arr = ensureArray<ModInfo>(data);
  return arr.filter((m: any) => m && m.name && m.package_id);
};

const validateResources = (data: unknown): ResourceSummary => {
  const d = (data ?? {}) as Record<string, any>;
  const categories = ensureArray<any>(d.categories).map((category) => ({
    category: category.category,
    count: category.count ?? 0,
    market_value: category.market_value ?? category.marketValue ?? 0,
  }));

  return {
    total_items: d.total_items ?? d.totalItems ?? 0,
    total_market_value: d.total_market_value ?? d.totalMarketValue ?? 0,
    categories,
  };
};

const validateCreatures = (data: unknown): CreaturesSummary => {
  const d = (data ?? {}) as Record<string, any>;
  return {
    colonists_count: d.colonists_count ?? d.colonistsCount ?? 0,
    prisoners_count: d.prisoners_count ?? d.prisonersCount ?? 0,
    enemies_count: d.enemies_count ?? d.enemiesCount ?? 0,
    animals_count: d.animals_count ?? d.animalsCount ?? 0,
    insectoids_count: d.insectoids_count ?? d.insectoidsCount ?? 0,
    mechanoids_count: d.mechanoids_count ?? d.mechanoidsCount ?? 0,
  };
};

const validatePower = (data: unknown): PowerInfo => {
  const d = (data ?? {}) as Record<string, any>;
  return {
    current_power: d.current_power ?? 0,
    total_possible_power: d.total_possible_power ?? 0,
    currently_stored_power: d.currently_stored_power ?? 0,
    total_power_storage: d.total_power_storage ?? 0,
    total_consumption: d.total_consumption ?? 0,
    consumption_power_on: d.consumption_power_on ?? 0,
  };
};

const validateResearchSummary = (data: unknown): ResearchSummary => {
  const d = (data ?? {}) as Record<string, any>;
  return {
    finished_projects_count: d.finished_projects_count ?? 0,
    total_projects_count: d.total_projects_count ?? 0,
    available_projects_count: d.available_projects_count ?? 0,
    by_tech_level: d.by_tech_level ?? {},
    by_tab: d.by_tab ?? {},
  };
};

const validateResearchProgress = (data: unknown): ResearchProgress => {
  if (!data) {
    return {
      name: "None",
      label: "None",
      progress: 0,
      research_points: 0,
      description: "No active research",
      is_finished: false,
      can_start_now: false,
      player_has_any_appropriate_research_bench: false,
      required_analyzed_thing_count: 0,
      analyzed_things_completed: 0,
      tech_level: "Unknown",
      prerequisites: [],
      hidden_prerequisites: [],
      required_by_this: [],
      progress_percent: 0,
    };
  }

  const d = data as Record<string, any>;
  return {
    name: d.name ?? "None",
    label: d.label ?? "None",
    progress: d.progress ?? 0,
    research_points: d.research_points ?? 0,
    description: d.description ?? "No description available",
    is_finished: Boolean(d.is_finished),
    can_start_now: Boolean(d.can_start_now),
    player_has_any_appropriate_research_bench:
      Boolean(d.player_has_any_appropriate_research_bench),
    required_analyzed_thing_count: d.required_analyzed_thing_count ?? 0,
    analyzed_things_completed: d.analyzed_things_completed ?? 0,
    tech_level: d.tech_level ?? "Unknown",
    prerequisites: d.prerequisites ?? [],
    hidden_prerequisites: d.hidden_prerequisites ?? [],
    required_by_this: d.required_by_this ?? [],
    progress_percent: d.progress_percent ?? 0,
  };
};

const validateResearchFinished = (data: unknown): ResearchFinished => {
  const d = (data ?? {}) as Record<string, any>;
  return { finished_projects: d.finished_projects ?? [] };
};

// -----------------------------
// High-level actions
// -----------------------------
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

export const selectAndViewColonist = async (
  colonistId: number,
  _colonistName: string, // kept for API compatibility
): Promise<void> => {
  try {
    const colonistData = await getJson<{ position?: { x: number; y: number; z: number } }>(
      `/colonist?id=${colonistId}&fields=position`,
    );

    if (!colonistData?.position) {
      throw new Error("Failed to get colonist position");
    }

    await postNoBody(`/deselect?type=all`);
    await postNoBody(`/select?type=pawn&id=${colonistId}`);
    await postNoBody(`/camera/change/zoom?zoom=14`);
    await postNoBody(
      `/camera/change/position?x=${colonistData.position.x}&y=${colonistData.position.z}`,
    );
    await postNoBody(`/open-tab?type=health`);
  } catch (err) {
    console.error("Failed to navigate to colonist:", err);
    throw err;
  }
};

// -----------------------------
// Aggregated fetch
// -----------------------------
export const fetchRimWorldData = async (): Promise<RimWorldData> => {
  const timestamp = Date.now();

  const [
    gameState,
    colonistsResp,
    colonistsDetailedRaw,
    resourcesRaw,
    creaturesRaw,
    powerRaw,
    map_datetime,
    weather,
    researchProgressRaw,
    researchFinishedRaw,
    researchSummaryRaw,
    modsInfoRaw,
  ] = await Promise.all([
    getJson<GameState>("/game/state"),
    getJson<Colonist[]>("/colonists?fields=id,name,gender,age,health,mood"),
    getJson<ColonistDetailed[]>("/colonists/detailed"),
    getJson<ResourceSummary>("/resources/summary?map_id=0"),
    getJson<CreaturesSummary>("/map/creatures/summary?map_id=0"),
    getJson<PowerInfo>(`/map/power/info?map_id=0&_=${timestamp}`),
    getJson<DatetimeCategory>("/datetime?at=current_map"),
    getJson<WeatherCategory>("/map/weather?map_id=0"),
    getJson<ResearchProgress>("/research/progress"),
    getJson<ResearchFinished>("/research/finished"),
    getJson<ResearchSummary>("/research/summary"),
    getJson<ModInfo[]>("/mods/info"),
  ]);

  return {
    gameState: validateGameState(gameState),
    colonists: colonistsResp,
    colonistsDetailed: validateColonistsDetailed(colonistsDetailedRaw),
    resources: validateResources(resourcesRaw),
    creatures: validateCreatures(creaturesRaw),
    power: validatePower(powerRaw),
    map_datetime,
    weather,
    researchProgress: validateResearchProgress(researchProgressRaw),
    researchFinished: validateResearchFinished(researchFinishedRaw),
    researchSummary: validateResearchSummary(researchSummaryRaw),
    modsInfo: validateModsInfo(modsInfoRaw),
  };
};

// -----------------------------
// Thin endpoint wrappers
// -----------------------------
export const rimworldApi = {
  async getResourcesStored(mapId: number = 0): Promise<ResourcesData> {
    const data = await getJson<ResourcesData>(`/resources/stored?map_id=${mapId}`);
    return data as ResourcesData;
  },

  async getItemImage(defName: string): Promise<ItemImageResponse> {
    const name = encodeURIComponent(defName);
    const data = await getJson<ItemImageResponse>(`/item/image?name=${name}`);
    return data as ItemImageResponse;
  },

  async getPawns(): Promise<Colonist[]> {
    const response = await getJson<{ colonists: Colonist[] }>(
      "/colonists?fields=id,name,gender,age",
    );
    return validateColonists(response?.colonists ?? []);
  },

  // Placeholder for future backend call
  async getItemDetails(_itemId: string, _pawnId: string): Promise<{ success: boolean }> {
    return { success: true };
  },

  async assignItemToPawn(
    itemId: string,
    itemType: string,
    pawnId: string,
  ): Promise<{ success: boolean }> {
    await postNoBody(
      `/jobs/make/equip?item_type=${encodeURIComponent(itemType)}&map_id=0&pawn_id=${encodeURIComponent(
        pawnId,
      )}&item_id=${encodeURIComponent(itemId)}`,
    );
    return { success: true };
  },

  async getPawnPortraitImage(pawnId: string): Promise<ItemImageResponse> {
    const data = await getJson<ItemImageResponse>(
      `/pawn/portrait/image?pawn_id=${encodeURIComponent(pawnId)}&width=64&height=64&direction=south`,
    );
    return data as ItemImageResponse;
  },
};
