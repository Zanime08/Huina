import memesJson from '../../data/memes.json';
import eventsJson from '../../data/events.json';
import upgradesJson from '../../data/upgrades.json';
import achievementsJson from '../../data/achievements.json';

export interface MemeDef {
  id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  virality: number;
  stamina: number;
  volatility: number;
  hue: number;
  face: number;
  seasons: number[];
  name: { ru: string; en: string };
  tagline: { ru: string; en: string };
}

export type EventKind = 'good' | 'bad' | 'neutral' | 'legend';
export type EventTarget = 'random' | 'highest' | 'lowest' | 'all' | 'none';

export interface EventDef {
  id: string;
  weight: number;
  minDay: number;
  kind: EventKind;
  target: EventTarget;
  hype: number;
  cash?: number;
  energy?: number;
  text: { ru: string; en: string };
}

export interface UpgradeDef {
  id: string;
  maxLevel: number;
  costs: number[];
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
}

export interface AchievementDef {
  id: string;
  reward: number;
  icon: string;
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
}

export const MEMES: MemeDef[] = memesJson as MemeDef[];
export const EVENTS: EventDef[] = eventsJson as EventDef[];
export const UPGRADES: UpgradeDef[] = upgradesJson as UpgradeDef[];
export const ACHIEVEMENTS: AchievementDef[] = achievementsJson as AchievementDef[];

export const memeById = new Map(MEMES.map((m) => [m.id, m]));

export function poolForSeason(season: number): MemeDef[] {
  const pool = MEMES.filter((m) => m.seasons.includes(season));
  return pool.length > 0 ? pool : MEMES;
}
