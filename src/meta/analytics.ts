// Analytics: Yandex Metrica reachGoal (when counter configured) + in-memory log for debug.
// No personal data. Counter id via VITE_METRICA_ID env at build time.
export interface AnalyticsEvent {
  t: number;
  name: string;
  params?: Record<string, string | number | boolean>;
}

declare global {
  interface Window {
    ym?: (id: number, action: string, goal: string, params?: unknown) => void;
  }
}

const MAX_LOG = 60;

class Analytics {
  readonly log: AnalyticsEvent[] = [];
  private counterId: number | null = null;

  configure(): void {
    const raw = (import.meta.env.VITE_METRICA_ID as string | undefined) ?? '';
    const id = parseInt(raw, 10);
    this.counterId = Number.isFinite(id) && id > 0 ? id : null;
  }

  event(name: string, params?: Record<string, string | number | boolean>): void {
    this.log.push({ t: Date.now(), name, params });
    if (this.log.length > MAX_LOG) this.log.shift();
    if (this.counterId && typeof window.ym === 'function') {
      try {
        window.ym(this.counterId, 'reachGoal', name, params);
      } catch { /* noop */ }
    } else if (import.meta.env.DEV) {
      console.debug('[analytics]', name, params ?? '');
    }
  }
}

export const analytics = new Analytics();
