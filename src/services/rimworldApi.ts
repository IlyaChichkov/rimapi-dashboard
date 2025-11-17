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
  return arr.filter((c: any) => c && c.id);
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

// Small helper
async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Read a File -> base64 (no data:... prefix)
async function fileToBase64NoHeader(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

/**
 * Upload item texture via chunked Base64 parts.
 * Sends multiple POSTs to /api/v1/item/image with:
 *  - name: string (item_def_name)
 *  - image: base64 chunk (string)
 *  - final: boolean (true for the last part)
 */
async function setItemTextureChunks({
  itemDefName,
  base64,
  chunkSize = 750 * 1024,
  onProgress,
}: {
  itemDefName: string;
  base64: string;                // no data: header — pure base64
  chunkSize?: number;
  onProgress?: (percent: number, sentBytes: number, totalBytes: number, chunkIndex: number) => void;
}) {
  const total = base64.length;
  let sent = 0;
  let idx = 0;

  while (sent < total) {
    const next = Math.min(sent + chunkSize, total);
    const piece = base64.slice(sent, next);
    const isFinal = next >= total;

    await postJson('/item/image', {
      name: itemDefName,
      image: piece,
      final: isFinal
    });
    sent = next;
    idx++;
    const percent = Math.round((sent / total) * 100);
    onProgress?.(percent, sent, total, idx);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const result = String(fr.result || '');
      // strip "data:image/...;base64," if present
      const i = result.indexOf('base64,');
      resolve(i >= 0 ? result.slice(i + 'base64,'.length) : result);
    };
    fr.readAsDataURL(file);
  });
}
/**
 * High-level helper: takes a File, converts to base64 (no header), and uploads in chunks.
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
  let idx = 0;

  // public string Name { get; set; }
  // public string Image { get; set; }
  // public string Direction { get; set; }
  // public string ThingType { get; set; }
  // public string IsStackable { get; set; }
  // public string MaskImage { get; set; }

  const direction = opts?.direction === undefined ? "all" : opts?.direction; 

  await postJson('/item/image', {
    name: itemName,
    image: base64,
    direction: direction,
    ThingType: opts?.kind,
    UpdateItemIndex: opts?.imageIndex,
  });

  opts?.onProgress?.(100, total, total, idx);
}


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
    return validateColonists(response);
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
  
  async setColonistWorkPriority(id: number, work: string, priority: number): Promise<void> {
    const capitalize = (s: string) => (s && String(s[0]).toUpperCase() + String(s).slice(1)) || ""
    await request<void>(`/colonist/work-priority?id=${id}&work=${capitalize(work)}&priority=${priority}`, {
      method: "POST",
    });
  },

  async setColonistsWorkPriorities (
    workPriorities: { id: number; work: string; priority: number }[]
  ): Promise<void> {
    await request<void>('/colonists/work-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workPriorities),
    });
  },

  async fetchColonistInventory (colonistId: number) {
    const data = await getJson<{ items: any[] }>(`/colonist/inventory?id=${colonistId}`);
    return data.items;  // Returning just the inventory items
  },

  async fetchWorkList (): Promise<string[]> {
    const data = await getJson<{ work: string[] }>('/work-list');
    return data?.work || [];
  },
  
  uploadItemTextureFile,

  async setStuffColor(name: string, hex: string): Promise<void> {
    const cleanHex = hex.replace(/^#/, '');
    await postJson('/stuff/color', {
      name,
      hex: cleanHex,
    });
  },

  async fetchMaterialsAtlas(): Promise<{ materials: string[] }> {
    return getJson('/materials-atlas');
  },

  async clearMaterialsAtlas(): Promise<void> {
    await postJson('/materials-atlas/clear', {});
  },
};

