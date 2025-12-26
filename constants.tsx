
import { ThemeType, ThemeConfig } from './types';

export const THEMES: Record<ThemeType, ThemeConfig> = {
  sunrise: {
    bg: 'bg-orange-50',
    accent: 'bg-orange-400',
    text: 'text-orange-900',
    card: 'bg-white/80 border-orange-100',
    icon: 'text-orange-500',
    overlay: 'bg-orange-200/20'
  },
  earth: {
    bg: 'bg-emerald-50',
    accent: 'bg-emerald-600',
    text: 'text-emerald-900',
    card: 'bg-white/80 border-emerald-100',
    icon: 'text-emerald-600',
    overlay: 'bg-emerald-200/20'
  },
  rain: {
    bg: 'bg-slate-100',
    accent: 'bg-slate-500',
    text: 'text-slate-900',
    card: 'bg-white/80 border-slate-200',
    icon: 'text-slate-600',
    overlay: 'bg-slate-300/20'
  },
  fire: {
    bg: 'bg-stone-100',
    accent: 'bg-red-600',
    text: 'text-stone-900',
    card: 'bg-white/80 border-red-100',
    icon: 'text-red-500',
    overlay: 'bg-red-200/20'
  },
  night: {
    bg: 'bg-slate-950',
    accent: 'bg-indigo-500',
    text: 'text-slate-100',
    card: 'bg-slate-900/80 border-slate-800',
    icon: 'text-indigo-400',
    overlay: 'bg-indigo-900/20'
  },
};

export const OPTIONS = {
  timeOfDay: [
    { value: 'dawn', label: 'Dawn', icon: 'fa-sun-plant-wilt' },
    { value: 'day', label: 'Full Day', icon: 'fa-sun' },
    { value: 'dusk', label: 'Dusk', icon: 'fa-moon' },
    { value: 'night', label: 'Deep Night', icon: 'fa-stars' },
  ],
  energyLevel: [
    { value: 'low', label: 'Low', icon: 'fa-battery-quarter' },
    { value: 'moderate', label: 'Flow', icon: 'fa-battery-half' },
    { value: 'high', label: 'High', icon: 'fa-battery-full' },
  ],
  weatherFeel: [
    { value: 'clear', label: 'Clear', icon: 'fa-cloud-sun' },
    { value: 'heavy', label: 'Heavy', icon: 'fa-cloud-showers-heavy' },
    { value: 'shifting', label: 'Shifting', icon: 'fa-wind' },
    { value: 'quiet', label: 'Quiet', icon: 'fa-leaf' },
  ],
  solitude: [
    { value: 'alone', label: 'Solitude', icon: 'fa-user' },
    { value: 'few', label: 'Few Souls', icon: 'fa-users-rays' },
    { value: 'busy', label: 'Connected', icon: 'fa-people-group' },
  ],
  intent: [
    { value: 'push', label: 'Push', icon: 'fa-mountain' },
    { value: 'wander', label: 'Wander', icon: 'fa-route' },
    { value: 'observe', label: 'Observe', icon: 'fa-eye' },
    { value: 'reset', label: 'Reset', icon: 'fa-breath' },
  ],
  terrain: [
    { value: 'forest', label: 'Forest', icon: 'fa-tree' },
    { value: 'alpine', label: 'Alpine', icon: 'fa-mountain-sun' },
    { value: 'coastal', label: 'Coastal', icon: 'fa-water' },
    { value: 'desert', label: 'Desert', icon: 'fa-cactus' },
    { value: 'meadow', label: 'Meadow', icon: 'fa-seedling' },
  ],
  sensory: [
    { value: 'echoes', label: 'Echoes', icon: 'fa-wave-square' },
    { value: 'textures', label: 'Textures', icon: 'fa-hand-dots' },
    { value: 'scents', label: 'Scents', icon: 'fa-wind' },
    { value: 'gradients', label: 'Gradients', icon: 'fa-palette' },
  ]
};
