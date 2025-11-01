// src/services/rimworldApi.ts
import {
  RimWorldData, GameState, Colonist, ResourceSummary,
  CreaturesSummary, PowerInfo, DatetimeCategory, WeatherCategory,
  ResearchProgress,
  ResearchFinished,
  ResearchSummary,
  ColonistDetailed,
  ModInfo
} from '../types';

let API_BASE_URL = 'http://localhost:8765/api/v1';

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url;
};

export const getApiBaseUrl = () => {
  return API_BASE_URL;
};

const fetchApiPost = async <T>(endpoint: string, options: RequestInit = {}): Promise<T | null> => {
  // For POST requests, use a simpler approach without Content-Type to avoid preflight
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...(options.method !== 'POST' ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    mode: 'cors', // Ensure CORS mode
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
  console.log(`Fetch: ${API_BASE_URL}${endpoint}`, options.method || 'GET');
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // For POST requests that might not return JSON, check content type
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    console.log(`Data: `, data);
    return data;
  } else {
    // For empty responses or non-JSON responses
    console.log(`Response status: ${response.status}`);
    return null;
  }
};

const fetchApi = async <T>(endpoint: string): Promise<T | null> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`,{
    headers: {
      
    }
  });
  console.log(`Fetch: ${API_BASE_URL}${endpoint}`)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  var data = await response.json()
  console.log(`Data: `, data)
  return data;
};

const validateGameState = (data: any): GameState => {
  if (!data) return {};
  return {
    game_time: data.game_time || 'Unknown',
    time_speed: data.time_speed || 'Unknown',
    weather: data.weather || 'Unknown',
    temperature: data.temperature || 0,
    storyteller: data.storyteller || 'Unknown',
    difficulty: data.difficulty || 'Unknown'
  };
};

const validateColonists = (data: any): Colonist[] => {
  if (!data) {
    return [];
  }
  return data.filter((col: any) => col && col.id && col.name);
};

const validateColonistsDetailed = (data: any): ColonistDetailed[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.filter((col: any) => col && col.colonist && col.colonist_medical_info);
};

const validateModsInfo = (data: any): ModInfo[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.filter((mod: any) => mod && mod.name && mod.package_id);
};

const validateResources = (data: any): ResourceSummary => {
  if (!data) return { categories: [] };
  
  const totalItems = data.total_items || data.totalItems || 0;
  const totalMarketValue = data.total_market_value || data.totalMarketValue || 0;
  
  const categories = (data.categories || []).map((category: any) => ({
    category: category.category,
    count: category.count,
    market_value: category.market_value || category.marketValue || 0
  }));

  return {
    total_items: totalItems,
    total_market_value: totalMarketValue,
    categories: categories
  };
};

const validateCreatures = (data: any): CreaturesSummary => {
  if (!data) return {};
  return {
    colonists_count: data.colonists_count || data.colonistsCount || 0,
    prisoners_count: data.prisoners_count || data.prisonersCount || 0,
    enemies_count: data.enemies_count || data.enemiesCount || 0,
    animals_count: data.animals_count || data.animalsCount || 0,
    insectoids_count: data.insectoids_count || data.insectoidsCount || 0,
    mechanoids_count: data.mechanoids_count || data.mechanoidsCount || 0
  };
};

const validatePower = (data: any): PowerInfo => {
  if (!data) return {};
  return {
    current_power: data.current_power || 0,
    total_possible_power: data.total_possible_power || 0,
    currently_stored_power: data.currently_stored_power || 0,
    total_power_storage: data.total_power_storage || 0,
    total_consumption: data.total_consumption || 0,
    consumption_power_on: data.consumption_power_on || 0
  };
};

const validateResearchSummary = (data: any): ResearchSummary => {
  if (!data) {
    return {
      finished_projects_count: 0,
      total_projects_count: 0,
      available_projects_count: 0,
      by_tech_level: {},
      by_tab: {}
    };
  }
  
  return {
    finished_projects_count: data.finished_projects_count || 0,
    total_projects_count: data.total_projects_count || 0,
    available_projects_count: data.available_projects_count || 0,
    by_tech_level: data.by_tech_level || {},
    by_tab: data.by_tab || {}
  };
};

const validateResearchProgress = (data: any): ResearchProgress => {
  if (!data) {
    return {
      name: 'None',
      label: 'None',
      progress: 0,
      research_points: 0,
      description: 'No active research',
      is_finished: false,
      can_start_now: false,
      player_has_any_appropriate_research_bench: false,
      required_analyzed_thing_count: 0,
      analyzed_things_completed: 0,
      tech_level: 'Unknown',
      prerequisites: data.prerequisites || [], // Handle null
      hidden_prerequisites: data.hidden_prerequisites || [], // Handle null
      required_by_this: data.required_by_this || [], // Handle null
      progress_percent: 0
    };
  }
  
  return {
    name: data.name || 'None',
    label: data.label || 'None',
    progress: data.progress || 0,
    research_points: data.research_points || 0,
    description: data.description || 'No description available',
    is_finished: data.is_finished || false,
    can_start_now: data.can_start_now || false,
    player_has_any_appropriate_research_bench: data.player_has_any_appropriate_research_bench || false,
    required_analyzed_thing_count: data.required_analyzed_thing_count || 0,
    analyzed_things_completed: data.analyzed_things_completed || 0,
    tech_level: data.tech_level || 'Unknown',
    prerequisites: data.prerequisites || [], // Handle null
    hidden_prerequisites: data.hidden_prerequisites || [], // Handle null
    required_by_this: data.required_by_this || [], // Handle null
    progress_percent: data.progress_percent || 0
  };
};

const validateResearchFinished = (data: any): ResearchFinished => {
  if (!data) return { finished_projects: [] };
  return {
    finished_projects: data.finished_projects || []
  };
};

export const selectAndViewColonist = async (colonistId: number, colonistName: string): Promise<void> => {
  try {
    // First, get the colonist's current position
    const colonistData = await fetchApi<{ position: { x: number; y: number, z: number } }>(`/colonist?id=${colonistId}&fields=position`);
    
    if (!colonistData || !colonistData.position) {
      throw new Error('Failed to get colonist position');
    }

    await fetchApiPost(`/deselect?type=all`, { method: 'POST' });
    
    // Select the colonist
    await fetchApiPost(`/select?type=pawn&id=${colonistId}`, { method: 'POST' });
    
    // Move camera to colonist position
    await fetchApiPost(`/camera/change/position?x=${colonistData.position.x}&y=${colonistData.position.z}`, { method: 'POST' });
    
    // Change camera zoom to close level
    await fetchApiPost(`/camera/change/zoom?zoom=8`, { method: 'POST' });
    await fetchApiPost(`/open-tab?type=health`, { method: 'POST' });
    
    console.log(`Navigated to colonist ${colonistName} at position (${colonistData.position.x}, ${colonistData.position.z})`);
  } catch (error) {
    console.error('Failed to navigate to colonist:', error);
    throw error;
  }
};

export const fetchRimWorldData = async (): Promise<RimWorldData> => {
  const timestamp = Date.now();

  const [
    gameState,
    colonistsData,
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
    fetchApi<GameState>('/game/state'),
    fetchApi<{ colonists: Colonist[] }>('/colonists?fields=id,name,gender,age,health,mood'),
    fetchApi<ColonistDetailed[]>('/colonists/detailed'),
    fetchApi<ResourceSummary>('/resources/summary?map_id=0'),
    fetchApi<CreaturesSummary>('/map/creatures/summary?map_id=0'),
    fetchApi<PowerInfo>(`/map/power/info?map_id=0&_=${timestamp}`),
    fetchApi<DatetimeCategory>('/datetime?at=current_map'),
    fetchApi<WeatherCategory>('/map/weather?map_id=0'),
    fetchApi<ResearchProgress>('/research/progress'),
    fetchApi<ResearchFinished>('/research/finished'),
    fetchApi<ResearchSummary>('/research/summary'),
    fetchApi<ModInfo[]>('/mods/info')
  ]);

  return {
    gameState: validateGameState(gameState),
    colonists: validateColonists(colonistsData),
    colonistsDetailed: validateColonistsDetailed(colonistsDetailed),
    resources: validateResources(resources),
    creatures: validateCreatures(creatures),
    power: validatePower(power),
    map_datetime: map_datetime,
    weather: weather,
    researchProgress: validateResearchProgress(researchProgress),
    researchFinished: validateResearchFinished(researchFinished),
    researchSummary: validateResearchSummary(researchSummary),
    modsInfo: validateModsInfo(modsInfo),
  };
};