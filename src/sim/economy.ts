import { CONFIG } from '../config';
import { UPGRADES } from './memeRegistry';
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
