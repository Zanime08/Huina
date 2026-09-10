// All tunable balance in one place.
export const CONFIG = {
  season: 1,
  daysTotal: 10,
  dayLengthSec: 22,
  startCash: 100,
  goalProfit: 150,          // 1 star
  star2mult: 1.6,
  star3mult: 2.4,
  goalGrowthPerSeason: 1.25, // goal *= this each next season level
  maxEnergy: 3,
  energyPerDay: 1,
  boostHypeMin: 12,
  boostHypeMax: 20,
  farmBatch: 5,             // FARM buys N shares at once
  baseSlots: 3,
  maxSlots: 5,
  rewardCoinsWin: 60,       // meta coins for 1 star
  rewardPerStar: 40,
  rewardCoinsLose: 25,
  dailyBonus: 50,
  hypeTickRate: 1.6,        // hype drift per second at virality=1
  noiseScale: 6,            // random walk amplitude per second
  driftK: 0.31,             // lifecycle mean-reversion speed (× meme virality)
  priceBase: 2,             // price = priceBase + hype/100 * priceScale * phaseMult
  priceScale: 18,
  sellFeePct: 2,            // platform commission on sells — coin sink + anti pump-and-dump
  adCooldownSec: 180,       // min active play between interstitials
  saveVersion: 2,
  streakBonusPerDay: 15,     // extra daily coins per streak day (cap 7)
  maxSeason: 3,
  cloudSaveDebounceMs: 5000,
} as const;

export const PHASE_ORDER = ['fresh', 'rising', 'viral', 'peak', 'cringe', 'dead'] as const;
export type Phase = (typeof PHASE_ORDER)[number];

export const PHASE_MULT: Record<Phase, number> = {
  fresh: 0.8, rising: 1.0, viral: 1.4, peak: 2.0, cringe: 0.35, dead: 0.05,
};
