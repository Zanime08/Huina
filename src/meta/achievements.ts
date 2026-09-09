import { ACHIEVEMENTS } from '../sim/memeRegistry';
import { saveManager } from './saveManager';
import { bus, Events } from '../core/EventBus';
import type { SeasonState } from '../sim/seasonSim';
import { seasonResult } from '../sim/seasonSim';

export function unlock(id: string): boolean {
  const d = saveManager.data;
  if (d.achievements.includes(id)) return false;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return false;
  d.achievements.push(id);
  saveManager.addCoins(def.reward);
  saveManager.saveAll();
  bus.emit(Events.ACHIEVEMENT, id);
  return true;
}

/** Check end-of-season achievements. Returns newly unlocked ids. */
export function checkSeasonAchievements(s: SeasonState): string[] {
  const got: string[] = [];
  const { won, stars, profit } = seasonResult(s);
  const d = saveManager.data;
  const need = (id: string) => !d.achievements.includes(id) && !got.includes(id);

  if (won && need('first_profit')) got.push('first_profit');
  if (stars >= 3 && need('triple_star')) got.push('triple_star');
  if (s.stats.peakSells > 0 && need('peak_seller')) got.push('peak_seller');
  if (s.stats.crashedWhileHolding && need('crash_survivor')) got.push('crash_survivor');
  if (s.stats.burmaldaSeen && need('burmalda')) got.push('burmalda');
  if (s.stats.maxCash >= 1000 && need('rich')) got.push('rich');
  if (s.stats.boosts >= 15 && need('booster')) got.push('booster');
  if (s.stats.nicheProfit && need('niche')) got.push('niche');
  if (won && s.stats.daysInRed >= 3 && need('comeback')) got.push('comeback');
  if (d.collection.length >= 6 && need('collector6')) got.push('collector6');
  if (d.collection.length >= 12 && need('collector12')) got.push('collector12');
  void profit;

  for (const id of got) unlock(id);
  return got;
}
