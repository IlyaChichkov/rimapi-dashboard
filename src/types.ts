// src/types.ts

export interface RimWorldData {
  gameState?: GameState;
  colonists?: Colonist[];
  colonistsDetailed?: ColonistDetailed[];
  resources?: ResourceSummary;
  creatures?: CreaturesSummary;
  power?: any;
  map_datetime?: any;
  weather?: any;
  researchProgress?: ResearchProgress;
  researchFinished?: ResearchFinished;
  researchSummary?: ResearchSummary;
  modsInfo?: ModInfo[];
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

export interface ColonistDetailed {
  sleep: number;
  comfort: number;
  surrounding_beauty: number;
  fresh_air: number;
  colonist: {
    id: number;
    name: string;
    gender: string;
    age: number;
    health: number;
    mood: number;
    hunger: number;
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
  colonist_medical_info: {
    health: number;
    hediffs: Hediff[];
    medical_policy_id: number;
    is_self_tend_allowed: boolean;
  };
  // ... other properties can be added as needed
}

export interface Hediff {
  load_id: number;
  def_name: string;
  label: string;
  label_cap: string;
  label_in_brackets: string;
  severity: number;
  severity_label: string;
  cur_stage_index: number;
  cur_stage_label: string | null;
  part_label: string | null;
  part_def_name: string | null;
  age_ticks: number;
  age_string: string;
  visible: boolean;
  is_permanent: boolean;
  is_tended: boolean;
  tendable_now: boolean;
  bleeding: boolean;
  bleed_rate: number;
  source_def_name: string | null;
  source_label: string | null;
  source_body_part_group_def_name: string | null;
  source_hediff_def_name: string | null;
  combat_log_text: string | null;
  tip_string_extra: string;
  pain_factor: number;
  pain_offset: number;
  is_lethal: boolean;
  is_currently_life_threatening: boolean;
  can_ever_kill: boolean;
}


export interface MedicalAlert {
  colonistId: number;
  colonistName: string;
  condition: string;
  severity: 'critical' | 'serious' | 'warning' | 'info';
  bodyPart: string;
  description: string;
  healthPercent: number;
  bleedRate?: number;
}

export interface ModInfo {
  name: string;
  package_id: string;
  load_order: number;
}

export interface ModsList {
  mods: ModInfo[];
}

