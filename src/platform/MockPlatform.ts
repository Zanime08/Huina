import type { IPlatform, LeaderboardEntry } from './IPlatform';

/** Local dev / fallback platform: everything works, ads simulate short delay. */
export class MockPlatform implements IPlatform {
  readonly isReal = false;
  simulateAdFail = false;

  async init(): Promise<void> { /* noop */ }

  getLang() {
    return (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' as const : 'en' as const;
  }

  serverTime(): number { return Date.now(); }

  async showInterstitial(): Promise<boolean> {
    if (this.simulateAdFail) return false;
    await new Promise((r) => setTimeout(r, 600));
    return true;
  }

  async showRewarded(): Promise<boolean> {
    if (this.simulateAdFail) return false;
    await new Promise((r) => setTimeout(r, 900));
    return true;
  }

  async cloudLoad(): Promise<unknown> { return null; }
  async cloudSave(): Promise<void> { /* noop */ }
  async submitScore(): Promise<void> { /* noop */ }
  /** Fill in tests/QA to emulate a populated leaderboard. */
  mockBoard: LeaderboardEntry[] = [];
  async getBoard(): Promise<LeaderboardEntry[]> { return this.mockBoard; }
  async auth(): Promise<string | null> { return 'Тестер'; }
  isAuthorized(): boolean { return true; }
  gameplayStart(): void { /* noop */ }
  gameplayStop(): void { /* noop */ }
  loadingReady(): void { /* noop */ }
  onGamePause(): void { /* noop */ }
  onGameResume(): void { /* noop */ }

  async share(text: string): Promise<boolean> {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return true;
      }
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dev/QA: defaults, overridable via URL for testing live config, e.g.
   * ?flags=adCooldownSec:60,weeklyBonus:0
   */
  async getFlags(defaults: Record<string, string>): Promise<Record<string, string>> {
    const out = { ...defaults };
    try {
      const raw = new URLSearchParams(location.search).get('flags');
      if (raw) {
        for (const pair of raw.split(',')) {
          const [k, v] = pair.split(':');
          if (k && v !== undefined && k in out) out[k] = v;
        }
      }
    } catch { /* noop */ }
    return out;
  }
}
