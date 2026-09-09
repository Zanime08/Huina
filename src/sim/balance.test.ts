import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../core/rng';
import { MEMES, EVENTS } from './memeRegistry';
import {
  createSeason, tickSeason, buyMeme, sellMeme, boostMeme,
  endSeason, seasonResult, SimCtx,
} from './seasonSim';

/** Reasonable-player bot: buy low fresh/rising, sell high or on cringe, boost mid. */
function playSeason(seed: number): number {
  const rng = mulberry32(seed);
  const defs = new Map(MEMES.map((m) => [m.id, m]));
  const ctx: SimCtx = { rng, defs, events: EVENTS };
  const s = createSeason(MEMES, EVENTS, {
    slots: 3, startCash: 100, maxEnergy: 3, energyPerDay: 1,
    luck: 0, boostPower: 1, goal: 150, daysTotal: 10, dayLength: 22,
  }, rng);
  let guard = 0;
  while (!s.over && guard++ < 10000) {
    // act once per ~2s of game time
    for (let i = 0; i < s.memes.length; i++) {
      const m = s.memes[i];
      if (m.dead) continue;
      if ((m.phase === 'fresh' || m.phase === 'rising') && m.hype < 60 && s.cash > 60) {
        buyMeme(s, i, 5);
      }
      if (m.stake > 0 && (m.hype >= 68 || m.phase === 'cringe' || m.phase === 'peak')) {
        sellMeme(s, i, 1, ctx);
      }
      if (m.hype >= 40 && m.hype < 70 && s.energy >= 2) boostMeme(s, i, ctx);
    }
    tickSeason(s, 2, ctx);
  }
  endSeason(s);
  return seasonResult(s).profit;
}

describe('balance', () => {
  it('reports win-rate over 40 seeds (design guard)', () => {
    const profits: number[] = [];
    for (let seed = 1; seed <= 40; seed++) profits.push(playSeason(seed * 7919));
    const wins = profits.filter((p) => p >= 150).length;
    const avg = profits.reduce((a, b) => a + b, 0) / profits.length;
    const sorted = [...profits].sort((a, b) => a - b);
    console.log(`[balance] wins ${wins}/40, avg ${avg.toFixed(0)}, median ${sorted[20].toFixed(0)}, min ${sorted[0].toFixed(0)}, max ${sorted[39].toFixed(0)}`);
    // A decent player should usually win season 1 (goal 150), but not always.
    expect(wins).toBeGreaterThanOrEqual(20);
    expect(wins).toBeLessThanOrEqual(38);
    expect(avg).toBeGreaterThan(100);
  });
});
