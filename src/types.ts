// src/types.ts

export interface RimWorldData {
  gameState?: GameState;
  colonists?: Colonist[];
  resources?: ResourceSummary;
  creatures?: CreaturesSummary;
  power?: any;
  map_datetime?: any;
  weather?: any;
  researchProgress?: ResearchProgress;
  researchFinished?: ResearchFinished;
  researchSummary?: ResearchSummary;
}

export interface GameState {
  game_time?: string;
  time_speed?: string;
  weather?: string;
  temperature?: number;
  storyteller?: string;
  difficulty?: string;
}

export interface Colonist {
  id: number;
  name: string;
  gender?: string;
  age?: number;
  health?: number;
  mood?: number;
  skills?: Skill[];
}

export interface Skill {
  skill: string;
  level: number;
}

export interface ResourceSummary {
  total_items?: number;
  total_market_value?: number;
  categories?: ResourceCategory[];
}

export interface ResourceCategory {
  category: string;
  count: number;
  market_value: number; // Updated to market_value
}

export interface DatetimeCategory {
  datetime: string;
}

export interface WeatherCategory {
  weather: string;
  temperature: number;
}

export interface CreaturesSummary {
  colonists_count?: number;
  prisoners_count?: number;
  enemies_count?: number;
  animals_count?: number;
  insectoids_count?: number;
  mechanoids_count?: number;
}

export interface PowerInfo {
  current_power?: number;
  total_possible_power?: number;
  currently_stored_power?: number;
  total_power_storage?: number;
  total_consumption?: number;
  consumption_power_on?: number;
}

export interface ResearchProgress {
  name: string;
  label: string;
  progress: number;
  research_points: number;
  description: string;
  is_finished: boolean;
  can_start_now: boolean;
  player_has_any_appropriate_research_bench: boolean;
  required_analyzed_thing_count: number;
  analyzed_things_completed: number;
  tech_level: string;
  prerequisites: string[];
  hidden_prerequisites: string[];
  required_by_this: string[];
  progress_percent: number;
}


export interface ResearchFinished {
  finished_projects: string[];
}

export interface TechLevelSummary {
  finished: number;
  total: number;
  percent_complete: number;
  projects: string[];
}

export interface ResearchSummary {
  finished_projects_count: number;
  total_projects_count: number;
  available_projects_count: number;
  by_tech_level: {
    [key: string]: TechLevelSummary;
  };
  by_tab: {
    [key: string]: TechLevelSummary;
  };
}