import { Layout } from 'react-grid-layout';

export type DashboardTab = 'dashboard' | 'medical' | 'research' | 'colonists' | 'resources' | 'tools';

export interface CardSettings {
  [key: string]: any;
}

export interface DashboardPreset {
  name: string;
  layout: Layout;
  cardSettings: CardSettings;
  backgroundImage?: string;
}

export interface DashboardLayoutState {
  layout: Layout;
  presets: DashboardPreset[];
  selectedPreset: string;
  cardSettings: CardSettings;
}