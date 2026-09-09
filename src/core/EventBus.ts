export type Handler = (payload?: unknown) => void;

export class EventBus {
  private map = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    let set = this.map.get(event);
    if (!set) { set = new Set(); this.map.set(event, set); }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.map.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.map.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try { h(payload); } catch (e) { console.error(`[bus:${event}]`, e); }
    }
  }

  clear(): void { this.map.clear(); }
}

export const bus = new EventBus();

export const Events = {
  LANG_CHANGED: 'lang',
  COINS_CHANGED: 'coins',
  SAVE_LOADED: 'save',
  ACHIEVEMENT: 'achievement',
  SEASON_END: 'season_end',
} as const;
