import { CONFIG } from '../config';
import { bus, Events } from '../core/EventBus';

export interface SaveData {
  saveVersion: number;
  coins: number;
  upgrades: Record<string, number>;
  collection: string[];
  achievements: string[];
  best: number;
  bestWeek: number;
  bestWeekStart: string;
  dailyBest: number;
  dailyDate: string;      // yyyy-mm-dd of last played daily
  seasonsPlayed: number;
  tutorialDone: boolean;
  settings: { lang: 'ru' | 'en' | 'auto'; music: number; sfx: number; muted: boolean };
  stats: { totalProfit: number; totalBoosts: number; burmaldaSeen: boolean };
}

const KEY = 'hype_factory_save_v1';

export function defaultSave(): SaveData {
  return {
    saveVersion: CONFIG.saveVersion,
    coins: 0, upgrades: {}, collection: [], achievements: [],
    best: 0, bestWeek: 0, bestWeekStart: '', dailyBest: 0, dailyDate: '',
    seasonsPlayed: 0, tutorialDone: false,
    settings: { lang: 'auto', music: 0.6, sfx: 0.8, muted: false },
    stats: { totalProfit: 0, totalBoosts: 0, burmaldaSeen: false },
  };
}

function migrate(raw: unknown): SaveData {
  const def = defaultSave();
  if (!raw || typeof raw !== 'object') return def;
  const r = raw as Partial<SaveData>;
  // v1: shallow merge with validation
  const out: SaveData = {
    ...def,
    ...r,
    saveVersion: CONFIG.saveVersion,
    settings: { ...def.settings, ...(r.settings ?? {}) },
    stats: { ...def.stats, ...(r.stats ?? {}) },
  };
  if (typeof out.coins !== 'number' || out.coins < 0 || out.coins > 1e9) out.coins = 0;
  if (!Array.isArray(out.collection)) out.collection = [];
  if (!Array.isArray(out.achievements)) out.achievements = [];
  if (typeof out.upgrades !== 'object' || !out.upgrades) out.upgrades = {};
  return out;
}

export class SaveManager {
  data: SaveData = defaultSave();
  private cloudGet: (() => Promise<unknown>) | null = null;
  private cloudSet: ((d: SaveData) => Promise<void>) | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  loadLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? migrate(JSON.parse(raw)) : defaultSave();
    } catch (e) {
      console.warn('[save] local load failed, using defaults', e);
      this.data = defaultSave();
    }
    bus.emit(Events.SAVE_LOADED);
  }

  saveLocal(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[save] local write failed', e);
    }
  }

  attachCloud(get: () => Promise<unknown>, set: (d: SaveData) => Promise<void>): void {
    this.cloudGet = get;
    this.cloudSet = set;
  }

  async loadCloud(): Promise<void> {
    if (!this.cloudGet) return;
    try {
      const raw = await this.cloudGet();
      if (raw && typeof raw === 'object') {
        const cloud = migrate(raw);
        // conflict: keep the one with more progress (seasons, then coins)
        const score = (d: SaveData) => d.seasonsPlayed * 1e6 + d.coins;
        if (score(cloud) > score(this.data)) {
          this.data = cloud;
          this.saveLocal();
          bus.emit(Events.SAVE_LOADED);
        }
      }
    } catch (e) {
      console.warn('[save] cloud load failed', e);
    }
  }

  saveAll(immediate = false): void {
    this.saveLocal();
    if (!this.cloudSet) return;
    if (immediate) {
      this.cloudSet(this.data).catch((e) => console.warn('[save] cloud write failed', e));
      return;
    }
    if (this.debounce) clearTimeout(this.debounce);
    const snapshot = JSON.parse(JSON.stringify(this.data)) as SaveData;
    this.debounce = setTimeout(() => {
      this.cloudSet?.(snapshot).catch((e) => console.warn('[save] cloud write failed', e));
    }, CONFIG.cloudSaveDebounceMs);
  }

  addCoins(n: number): void {
    this.data.coins = Math.max(0, Math.round(this.data.coins + n));
    bus.emit(Events.COINS_CHANGED, this.data.coins);
    this.saveAll();
  }

  reset(): void {
    this.data = defaultSave();
    this.saveAll(true);
    bus.emit(Events.COINS_CHANGED, 0);
    bus.emit(Events.SAVE_LOADED);
  }
}

export const saveManager = new SaveManager();
