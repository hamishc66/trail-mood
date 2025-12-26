
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type EnergyLevel = 'low' | 'moderate' | 'high';
export type WeatherFeel = 'clear' | 'heavy' | 'shifting' | 'quiet';
export type SolitudeLevel = 'alone' | 'few' | 'busy';
export type Intent = 'push' | 'wander' | 'observe' | 'reset';
export type TerrainType = 'forest' | 'alpine' | 'coastal' | 'desert' | 'meadow';
export type SensoryFocus = 'echoes' | 'textures' | 'scents' | 'gradients';
export type ThemeType = 'sunrise' | 'earth' | 'rain' | 'fire' | 'night';

export interface VibeSelection {
  timeOfDay: TimeOfDay;
  energyLevel: EnergyLevel;
  weatherFeel: WeatherFeel;
  solitudeLevel: SolitudeLevel;
  intent: Intent;
  terrain: TerrainType;
  sensory: SensoryFocus;
  customIntent?: string;
}

export interface VibeOutput {
  suggestedPace: string;
  suggestedMindset: string;
  musicGenres: string[];
  reflectiveThought: string;
  summary: string;
  visualUrl?: string; // AI Generated image URL
  nearbySpotVibe?: string;
  sources?: Array<{ title: string; uri: string }>;
  trailTotem?: { name: string; meaning: string; icon: string };
  asmrDescription?: string;
}

export interface ThemeConfig {
  bg: string;
  accent: string;
  text: string;
  card: string;
  icon: string;
  overlay: string;
}

export interface OracleMessage {
  role: 'user' | 'mountain';
  text: string;
}
