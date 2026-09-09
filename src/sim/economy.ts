import { CONFIG } from '../config';
import { UPGRADES, SEASONS } from './memeRegistry';
import type { SaveData } from '../meta/saveManager';

export interface UpgradeEffects {
  startCash: number;
  maxEnergy: number;
  energyPerDay: number;
  luck: number;
  slots: number;
  boostPower: number;
  insider: number;
}

export function upgradeEffects(save: SaveData): UpgradeEffects {
  const lv = (id: string) => save.upgrades[id] ?? 0;
  const energyLv = lv('energy');
  return {
    startCash: CONFIG.startCash + lv('cash') * 60,
    maxEnergy: CONFIG.maxEnergy + (energyLv >= 2 ? 1 : 0) + (energyLv >= 4 ? 1 : 0),
    energyPerDay: CONFIG.energyPerDay + (energyLv >= 1 ? 0 : 0) + (energyLv >= 3 ? 1 : 0),
    luck: lv('luck') * 0.12,
    slots: Math.min(CONFIG.maxSlots, CONFIG.baseSlots + lv('slots')),
    boostPower: 1 + lv('insider') * 0.15,
    insider: lv('insider'),
  };
}

export function seasonNumber(save: SaveData): number {
  return save.seasonsPlayed + 1;
}

export function goalForSeason(n: number): number {
  return Math.round(CONFIG.goalProfit * Math.pow(CONFIG.goalGrowthPerSeason, n - 1));
}

export function rewardForResult(won: boolean, stars: number): number {
  if (!won) return CONFIG.rewardCoinsLose;
  return CONFIG.rewardCoinsWin + stars * CONFIG.rewardPerStar;
}

export function upgradeCost(id: string, level: number): number | null {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def || level >= def.maxLevel) return null;
  return def.costs[level];
}

export function studioTier(save: SaveData): number {
  const total = Object.values(save.upgrades).reduce((a, b) => a + b, 0);
  if (total >= 14) return 4;
  if (total >= 9) return 3;
  if (total >= 5) return 2;
  if (total >= 2) return 1;
  return 0;
}

export const STUDIO_EMOJI = ['🏚️', '🏢', '🏬', '🌃', '🌆'];

/** Content season (meme pool rotation): unlocks as you play more seasons. */
export function contentSeason(save: SaveData): number {
  let cur = 1;
  for (const s of SEASONS) {
    if (save.seasonsPlayed >= s.unlockAfter && s.season <= CONFIG.maxSeason) cur = s.season;
  }
  return cur;
}

export function contentSeasonName(save: SaveData, lang: 'ru' | 'en'): string {
  const id = contentSeason(save);
  const def = SEASONS.find((s) => s.season === id) ?? SEASONS[0];
  return lang === 'ru' ? def.name.ru : def.name.en;
}

/** Streak bonus for playing daily on consecutive days. Call with today's key. */
export function streakBonus(save: SaveData, today: string): number {
  const st = save.streak;
  if (!st.lastDate) return 0;
  const prev = new Date(st.lastDate + 'T00:00:00Z').getTime();
  const now = new Date(today + 'T00:00:00Z').getTime();
  const diffDays = Math.round((now - prev) / 86400000);
  if (diffDays === 1) return Math.min(st.count + 1, 7) * CONFIG.streakBonusPerDay;
  return 0;
}

export function registerStreak(save: SaveData, today: string): number {
  const st = save.streak;
  if (st.lastDate === today) return 0;
  const bonus = streakBonus(save, today);
  const prev = st.lastDate ? new Date(st.lastDate + 'T00:00:00Z').getTime() : NaN;
  const now = new Date(today + 'T00:00:00Z').getTime();
  st.count = Number.isFinite(prev) && Math.round((now - prev) / 86400000) === 1 ? st.count + 1 : 1;
  st.lastDate = today;
  return bonus;
}
