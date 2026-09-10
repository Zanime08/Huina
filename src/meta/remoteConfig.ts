// Remote Config (Phase 26): Yandex console flags → live tuning without a rebuild.
// Values are ALWAYS strings; parsing is clamped so a bad console edit can't break the game.
import { CONFIG } from '../config';

const clampInt = (raw: string, min: number, max: number, fallback: number): number => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

let cosmeticPricePct = 100;

/** Known flags: key → parser+applier. Add new tunables here, never in gameplay code. */
const FLAG_DEFS: Array<{ key: string; apply: (raw: string) => void }> = [
  // min active play between interstitials, sec (platform may still throttle harder)
  { key: 'adCooldownSec', apply: (raw) => { (CONFIG as { adCooldownSec: number }).adCooldownSec = clampInt(raw, 60, 600, CONFIG.adCooldownSec); } },
  { key: 'dailyBonus', apply: (raw) => { (CONFIG as { dailyBonus: number }).dailyBonus = clampInt(raw, 0, 300, CONFIG.dailyBonus); } },
  { key: 'weeklyBonus', apply: (raw) => { (CONFIG as { weeklyBonus: number }).weeklyBonus = clampInt(raw, 0, 500, CONFIG.weeklyBonus); } },
  // seasonal event weight multiplier (in-season boost)
  { key: 'seasonalBoost', apply: (raw) => { (CONFIG as { seasonalBoost: number }).seasonalBoost = clampInt(raw, 1, 5, CONFIG.seasonalBoost); } },
  // cosmetic prices, % of base (sales are live-ops)
  { key: 'cosmeticPricePct', apply: (raw) => { cosmeticPricePct = clampInt(raw, 50, 200, 100); } },
];

export const DEFAULT_FLAGS: Record<string, string> = {
  adCooldownSec: String(CONFIG.adCooldownSec),
  dailyBonus: String(CONFIG.dailyBonus),
  weeklyBonus: String(CONFIG.weeklyBonus),
  seasonalBoost: '3',
  cosmeticPricePct: '100',
};

/** Apply server flags over current config. Unknown keys are ignored. */
export function applyRemoteFlags(raw: Record<string, string>): void {
  for (const def of FLAG_DEFS) {
    const v = raw[def.key];
    if (typeof v === 'string' && v !== '') {
      try { def.apply(v); } catch (e) { console.warn(`[flags] bad value for ${def.key}`, e); }
    }
  }
}

/** Restore built-in defaults (tests, debug panel). */
export function resetRemoteFlags(): void {
  applyRemoteFlags(DEFAULT_FLAGS);
  cosmeticPricePct = 100;
}

/** Current effective values as strings (debug panel / analytics). */
export function flagsSnapshot(): Record<string, string> {
  return {
    adCooldownSec: String(CONFIG.adCooldownSec),
    dailyBonus: String(CONFIG.dailyBonus),
    weeklyBonus: String(CONFIG.weeklyBonus),
    seasonalBoost: String(CONFIG.seasonalBoost),
    cosmeticPricePct: String(cosmeticPricePct),
  };
}

/** Cosmetic price in coins, after the remote discount/surcharge. */
export function cosmeticPrice(base: number): number {
  return Math.round((base * cosmeticPricePct) / 100);
}
