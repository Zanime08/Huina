// Pure season simulation: no DOM, no platform. Deterministic given (seed, actions).
import { CONFIG, PHASE_MULT, Phase } from '../config';
import { Rng, range, weighted, shuffle } from '../core/rng';
import { MemeDef, EventDef } from './memeRegistry';

export interface MemeState {
  defId: string;
  hype: number;
  ageDays: number;
  lifespan: number;
  phase: Phase;
  price: number;
  stake: number;
  invested: number;
  history: number[];
  peakHype: number;
  pastPeak: boolean;
  dead: boolean;
  trend: number;
}

export interface ResolvedNews {
  eventId: string;
  kind: string;
  textRu: string;
  textEn: string;
  memeId?: string;
}

export interface SeasonOpts {
  slots: number;
  startCash: number;
  maxEnergy: number;
  energyPerDay: number;
  luck: number;        // 0..~0.5 bonus weight to good events
  boostPower: number;  // multiplier
  goal: number;
  daysTotal: number;
  dayLength: number;
}

export interface SeasonStats {
  earned: number;
  boosts: number;
  peakSells: number;
  daysInRed: number;
  maxCash: number;
  burmaldaSeen: boolean;
  nicheProfit: boolean;
  crashedWhileHolding: boolean;
}

export interface SeasonState {
  opts: SeasonOpts;
  day: number;          // 1-based
  dayT: number;         // 0..1 progress of current day
  cash: number;
  startCash: number;
  energy: number;
  memes: MemeState[];
  pool: string[];       // defIds not yet spawned
  news: ResolvedNews[]; // today's news (shown in ticker)
  tomorrow: ResolvedNews[]; // pre-rolled, visible with insider upgrade
  over: boolean;
  gaveUp: boolean;
  stats: SeasonStats;
}

export interface SimCtx {
  rng: Rng;
  defs: Map<string, MemeDef>;
  events: EventDef[];
  lang?: 'ru' | 'en';
}

export function lifespanOf(def: MemeDef): number {
  return 3 + def.stamina * 3.5;
}

export function priceOf(m: MemeState): number {
  const base = CONFIG.priceBase + (m.hype / 100) * CONFIG.priceScale;
  return Math.max(0.5, Math.round(base * PHASE_MULT[m.phase] * 10) / 10);
}

export function phaseOf(m: MemeState): Phase {
  if (m.dead) return 'dead';
  if (m.hype <= 0.5 && m.ageDays >= 1) return 'dead';
  const declining = m.pastPeak && m.peakHype - m.hype > 25;
  const old = m.ageDays > m.lifespan * 0.75;
  if ((declining || old) && m.hype < 45) return 'cringe';
  if (m.hype >= 85) return 'peak';
  if (m.hype >= 55) return 'viral';
  if (m.hype >= 28) return 'rising';
  if (m.hype > 6) return 'fresh';
  // very low hype but young = fresh; old = cringe
  return m.ageDays > m.lifespan * 0.6 ? 'cringe' : 'fresh';
}

function spawnMeme(def: MemeDef, rng: Rng): MemeState {
  const lifespan = lifespanOf(def);
  const m: MemeState = {
    defId: def.id, hype: range(rng, 8, 22), ageDays: 0, lifespan,
    phase: 'fresh', price: 0, stake: 0, invested: 0, history: [],
    peakHype: 0, pastPeak: false, dead: false, trend: 0,
  };
  m.phase = phaseOf(m);
  m.price = priceOf(m);
  return m;
}

export function createSeason(
  defs: MemeDef[], events: EventDef[], opts: SeasonOpts, rng: Rng,
): SeasonState {
  const pool = shuffle(rng, defs.map((d) => d.id));
  const byId = new Map(defs.map((d) => [d.id, d]));
  const memes: MemeState[] = [];
  for (let i = 0; i < opts.slots && pool.length > 0; i++) {
    const def = byId.get(pool.pop() as string) as MemeDef;
    memes.push(spawnMeme(def, rng));
  }
  const s: SeasonState = {
    opts, day: 1, dayT: 0, cash: opts.startCash, startCash: opts.startCash,
    energy: opts.maxEnergy, memes, pool,
    news: [], tomorrow: [], over: false, gaveUp: false,
    stats: { earned: 0, boosts: 0, peakSells: 0, daysInRed: 0, maxCash: opts.startCash, burmaldaSeen: false, nicheProfit: false, crashedWhileHolding: false },
  };
  const ctx: SimCtx = { rng, defs: byId, events };
  s.news = rollNews(s, ctx);       // day 1 news
  applyNews(s, s.news, ctx);
  s.tomorrow = rollNews({ ...s, day: s.day + 1 }, ctx);
  return s;
}

/** Continuous hype drift. dt in seconds. */
export function tickSeason(s: SeasonState, dt: number, ctx: SimCtx): void {
  if (s.over) return;
  const dayLen = s.opts.dayLength;
  s.dayT += dt / dayLen;
  for (const m of s.memes) {
    if (m.dead) continue;
    const def = ctx.defs.get(m.defId) as MemeDef;
    const p = Math.min(1, (m.ageDays + s.dayT) / m.lifespan);
    // lifecycle curve: rise to 1.0 at p=0.5, fall to 0 at p=1
    const expected = 100 * Math.pow(Math.sin(Math.PI * Math.min(0.999, Math.max(0.001, p))), 0.7);
    const k = 0.25 * def.virality;
    const drift = (expected - m.hype) * k * dt * 0.25;
    const noise = (ctx.rng() - 0.5) * 2 * CONFIG.noiseScale * def.volatility * Math.sqrt(dt) * 0.4;
    const before = m.hype;
    m.hype = Math.max(0, Math.min(100, m.hype + drift * CONFIG.hypeTickRate * 0.25 + noise));
    m.trend = m.trend * 0.9 + (m.hype - before) * 10 * 0.1;
    if (m.hype > m.peakHype) m.peakHype = m.hype;
    if (m.peakHype >= 70 && m.peakHype - m.hype > 20) m.pastPeak = true;
    const ph = phaseOf(m);
    m.phase = ph;
    if (ph === 'dead') {
      m.dead = true;
      if (m.stake > 0) s.stats.crashedWhileHolding = true;
      m.stake = 0; m.invested = 0;
    }
    m.price = priceOf(m);
  }
  if (s.cash + portfolioValue(s) < s.startCash) {
    // red tracking sampled at day end instead — keep maxCash here
  }
  s.stats.maxCash = Math.max(s.stats.maxCash, s.cash);
  if (s.dayT >= 1) advanceDay(s, ctx);
}

export function portfolioValue(s: SeasonState): number {
  return s.memes.reduce((acc, m) => acc + m.stake * m.price, 0);
}

export function netWorth(s: SeasonState): number {
  return s.cash + portfolioValue(s);
}

function targetMemes(s: SeasonState, target: string, rng: Rng): MemeState[] {
  const alive = s.memes.filter((m) => !m.dead);
  if (target === 'all') return alive;
  if (target === 'none' || alive.length === 0) return [];
  if (target === 'highest') {
    const top = alive.reduce((a, b) => (a.hype > b.hype ? a : b));
    return [top];
  }
  if (target === 'lowest') {
    const low = alive.reduce((a, b) => (a.hype < b.hype ? a : b));
    return [low];
  }
  return [alive[Math.floor(rng() * alive.length)]];
}

function eventWeight(e: EventDef, s: SeasonState): number {
  if (s.day < e.minDay) return 0;
  if (e.kind === 'good' || e.kind === 'legend') return e.weight * (1 + s.opts.luck * 2);
  if (e.kind === 'bad') return e.weight * (1 - s.opts.luck);
  return e.weight;
}

export function rollNews(s: SeasonState, ctx: SimCtx): ResolvedNews[] {
  const out: ResolvedNews[] = [];
  const count = ctx.rng() < 0.35 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const e = weighted(ctx.rng, ctx.events, (ev) => eventWeight(ev, s));
    const targets = targetMemes(s, e.target, ctx.rng);
    const memeId = targets.length > 0 && e.target !== 'all' ? targets[0].defId : undefined;
    const def = memeId ? ctx.defs.get(memeId) : undefined;
    out.push({
      eventId: e.id, kind: e.kind, memeId,
      textRu: e.text.ru.replace('{meme}', def ? `«${def.name.ru}»` : 'рынка'),
      textEn: e.text.en.replace('{meme}', def ? `“${def.name.en}”` : 'the market'),
    });
  }
  return out;
}

export function applyNews(s: SeasonState, news: ResolvedNews[], ctx: SimCtx): void {
  for (const n of news) {
    const e = ctx.events.find((ev) => ev.id === n.eventId);
    if (!e) continue;
    if (e.id === 'ev_burmalda' || e.id === 'ev_reset') {
      if (e.id === 'ev_burmalda') s.stats.burmaldaSeen = true;
    }
    const targets = n.memeId
      ? s.memes.filter((m) => m.defId === n.memeId && !m.dead)
      : targetMemes(s, e.target, ctx.rng);
    for (const m of targets) {
      m.hype = Math.max(0, Math.min(100, m.hype + e.hype));
      m.phase = phaseOf(m);
      if (m.phase === 'dead') {
        m.dead = true;
        if (m.stake > 0) s.stats.crashedWhileHolding = true;
        m.stake = 0; m.invested = 0;
      }
      m.price = priceOf(m);
    }
    if (e.cash) s.cash = Math.max(0, s.cash + e.cash);
    if (e.energy) s.energy = Math.min(s.opts.maxEnergy, s.energy + e.energy);
  }
}

export function advanceDay(s: SeasonState, ctx: SimCtx): void {
  // end-of-day accounting
  for (const m of s.memes) {
    m.ageDays += 1;
    m.history.push(Math.round(m.hype));
    if (m.history.length > 24) m.history.shift();
  }
  if (netWorth(s) < s.startCash) s.stats.daysInRed += 1;
  if (s.day >= s.opts.daysTotal) {
    endSeason(s);
    return;
  }
  s.day += 1;
  s.dayT = 0;
  s.energy = Math.min(s.opts.maxEnergy, s.energy + s.opts.energyPerDay);
  // replace dead memes
  const byId = ctx.defs;
  for (let i = s.memes.length - 1; i >= 0; i--) {
    if (s.memes[i].dead && s.pool.length > 0) {
      const def = byId.get(s.pool.pop() as string) as MemeDef;
      s.memes[i] = spawnMeme(def, ctx.rng);
      s.memes[i].history = [Math.round(s.memes[i].hype)];
    }
  }
  // today's news = pre-rolled tomorrow; pre-roll next
  s.news = s.tomorrow;
  applyNews(s, s.news, ctx);
  s.tomorrow = s.day + 1 <= s.opts.daysTotal ? rollNews({ ...s, day: s.day + 1 }, ctx) : [];
}

export type ActionResult = { ok: boolean; reason?: string };

export function buyMeme(s: SeasonState, idx: number, shares: number): ActionResult {
  const m = s.memes[idx];
  if (!m || m.dead) return { ok: false, reason: 'dead' };
  const cost = Math.round(m.price * shares * 10) / 10;
  if (s.cash < cost) return { ok: false, reason: 'cash' };
  s.cash = Math.round((s.cash - cost) * 10) / 10;
  m.stake += shares;
  m.invested = Math.round((m.invested + cost) * 10) / 10;
  m.hype = Math.min(100, m.hype + shares * 0.5); // forcing the trend a bit
  m.phase = phaseOf(m);
  m.price = priceOf(m);
  return { ok: true };
}

export function sellMeme(s: SeasonState, idx: number, frac: 0.5 | 1, ctx: SimCtx): ActionResult {
  const m = s.memes[idx];
  if (!m || m.dead) return { ok: false, reason: 'dead' };
  if (m.stake <= 0) return { ok: false, reason: 'stake' };
  let n = frac === 1 ? m.stake : Math.max(1, Math.floor(m.stake / 2));
  n = Math.min(n, m.stake);
  const gain = Math.round(m.price * n * 10) / 10;
  const costBasis = (m.invested / m.stake) * n;
  s.cash = Math.round((s.cash + gain) * 10) / 10;
  s.stats.earned = Math.round((s.stats.earned + gain) * 10) / 10;
  if (m.hype >= 90) s.stats.peakSells += 1;
  if (m.hype < 20 && gain > costBasis) s.stats.nicheProfit = true;
  m.stake -= n;
  m.invested = Math.max(0, Math.round((m.invested - costBasis) * 10) / 10);
  void ctx;
  return { ok: true };
}

export function boostMeme(s: SeasonState, idx: number, ctx: SimCtx): ActionResult {
  const m = s.memes[idx];
  if (!m || m.dead) return { ok: false, reason: 'dead' };
  if (s.energy < 1) return { ok: false, reason: 'energy' };
  s.energy -= 1;
  s.stats.boosts += 1;
  const push = range(ctx.rng, CONFIG.boostHypeMin, CONFIG.boostHypeMax) * s.opts.boostPower;
  m.hype = Math.min(100, m.hype + push);
  if (ctx.rng() < 0.15 * s.opts.boostPower) m.hype = Math.min(100, m.hype + 15); // viral ignition
  m.phase = phaseOf(m);
  m.price = priceOf(m);
  return { ok: true };
}

export function endSeason(s: SeasonState): void {
  if (s.over) return;
  // auto-liquidate everything at current prices
  for (const m of s.memes) {
    if (m.stake > 0 && !m.dead) {
      s.cash = Math.round((s.cash + m.price * m.stake) * 10) / 10;
      m.stake = 0;
    }
  }
  s.over = true;
}

export function seasonResult(s: SeasonState): { profit: number; won: boolean; stars: number } {
  const profit = Math.round((s.cash - s.startCash) * 10) / 10;
  const won = !s.gaveUp && profit >= s.opts.goal;
  let stars = 0;
  if (won) {
    stars = 1;
    if (profit >= s.opts.goal * CONFIG.star2mult) stars = 2;
    if (profit >= s.opts.goal * CONFIG.star3mult) stars = 3;
  }
  return { profit, won, stars };
}
