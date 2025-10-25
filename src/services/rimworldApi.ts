// src/services/rimworldApi.ts
import {
  RimWorldData, GameState, Colonist, ResourceSummary,
  CreaturesSummary, PowerInfo, DatetimeCategory, WeatherCategory
} from '../types';

let API_BASE_URL = 'http://localhost:8765/api/v1';

export const setApiBaseUrl = (url: string) => {
  API_BASE_URL = url;
};

export const getApiBaseUrl = () => {
  return API_BASE_URL;
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

export const fetchRimWorldData = async (): Promise<RimWorldData> => {
  const timestamp = Date.now();

  const [
    gameState,
    colonistsData,
    resources,
    creatures,
    power,
    map_datetime,
    weather,
  ] = await Promise.all([
    fetchApi<GameState>('/game/state'),
    fetchApi<{ colonists: Colonist[] }>('/colonists?fields=id,name,gender,age,health,mood'),
    fetchApi<ResourceSummary>('/resources/summary?map_id=0'),
    fetchApi<CreaturesSummary>('/map/creatures/summary?map_id=0'),
    fetchApi<PowerInfo>(`/map/power/info?map_id=0&_=${timestamp}`),
    fetchApi<DatetimeCategory>('/datetime?at=current_map'),
    fetchApi<WeatherCategory>('/map/weather?map_id=0'),
  ]);

  return {
    gameState: validateGameState(gameState),
    colonists: validateColonists(colonistsData),
    resources: validateResources(resources),
    creatures: validateCreatures(creatures),
    power: validatePower(power),
    map_datetime: map_datetime,
    weather: weather
  };
};