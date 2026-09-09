import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../core/rng';
import { MEMES, EVENTS } from './memeRegistry';
import {
  createSeason, tickSeason, buyMeme, sellMeme, boostMeme,
  advanceDay, endSeason, seasonResult, netWorth, SimCtx,
} from './seasonSim';

function setup(seed = 12345) {
  const rng = mulberry32(seed);
  const defs = new Map(MEMES.map((m) => [m.id, m]));
  const ctx: SimCtx = { rng, defs, events: EVENTS };
  const s = createSeason(MEMES, EVENTS, {
    slots: 3, startCash: 100, maxEnergy: 3, energyPerDay: 1,
    luck: 0, boostPower: 1, goal: 150, daysTotal: 10, dayLength: 22,
  }, rng);
  return { s, ctx, rng };
}

describe('seasonSim', () => {
  it('creates a season with slots memes and day-1 news', () => {
    const { s } = setup();
    expect(s.memes.length).toBe(3);
    expect(s.day).toBe(1);
    expect(s.cash).toBe(100);
    expect(s.news.length).toBeGreaterThanOrEqual(1);
    expect(s.tomorrow.length).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for the same seed', () => {
    const a = setup(777);
    const b = setup(777);
    expect(a.s.memes.map((m) => m.defId)).toEqual(b.s.memes.map((m) => m.defId));
    expect(a.s.news.map((n) => n.eventId)).toEqual(b.s.news.map((n) => n.eventId));
  });

  it('buy/sell moves cash and stake consistently', () => {
    const { s } = setup();
    const m = s.memes[0];
    const price = m.price;
    const r = buyMeme(s, 0, 5);
    expect(r.ok).toBe(true);
    expect(m.stake).toBe(5);
    expect(s.cash).toBeCloseTo(100 - price * 5, 5);
    const cashBefore = s.cash;
    const r2 = sellMeme(s, 0, 1, { rng: mulberry32(1), defs: new Map(), events: [] });
    expect(r2.ok).toBe(true);
    expect(m.stake).toBe(0);
    expect(s.cash).toBeGreaterThan(cashBefore);
  });

  it('rejects buy without cash and sell without stake', () => {
    const { s } = setup();
    s.cash = 0;
    expect(buyMeme(s, 0, 5).ok).toBe(false);
    expect(sellMeme(s, 0, 1, { rng: mulberry32(1), defs: new Map(), events: [] }).ok).toBe(false);
  });

  it('boost consumes energy and raises hype', () => {
    const { s, ctx } = setup();
    const before = s.memes[0].hype;
    const r = boostMeme(s, 0, ctx);
    expect(r.ok).toBe(true);
    expect(s.energy).toBe(2);
    expect(s.memes[0].hype).toBeGreaterThan(before);
    s.energy = 0;
    expect(boostMeme(s, 0, ctx).ok).toBe(false);
  });

  it('ticks hype within bounds and advances days', () => {
    const { s, ctx } = setup();
    for (let i = 0; i < 220; i++) tickSeason(s, 0.5, ctx); // ~5 days
    for (const m of s.memes) {
      expect(m.hype).toBeGreaterThanOrEqual(0);
      expect(m.hype).toBeLessThanOrEqual(100);
    }
    expect(s.day).toBeGreaterThan(1);
  });

  it('ends season with liquidation and result', () => {
    const { s, ctx } = setup();
    buyMeme(s, 0, 5);
    for (let i = 0; i < 10; i++) advanceDay(s, ctx);
    expect(s.over).toBe(true);
    const res = seasonResult(s);
    expect(typeof res.profit).toBe('number');
    expect(res.stars).toBeGreaterThanOrEqual(0);
    // all liquidated
    expect(s.memes.every((m) => m.stake === 0)).toBe(true);
  });

  it('netWorth = cash + portfolio', () => {
    const { s } = setup();
    buyMeme(s, 0, 5);
    const m = s.memes[0];
    expect(netWorth(s)).toBeCloseTo(s.cash + m.stake * m.price, 5);
  });

  it('phases progress over a full idle season without NaN', () => {
    const { s, ctx } = setup(42);
    for (let i = 0; i < 12 && !s.over; i++) {
      for (let t = 0; t < 44 && !s.over; t++) tickSeason(s, 0.5, ctx);
    }
    expect(s.over).toBe(true);
    expect(Number.isFinite(s.cash)).toBe(true);
  });
});
