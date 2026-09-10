import type { IPlatform, Lang, LeaderboardEntry } from './IPlatform';

/**
 * Real Yandex Games SDK adapter.
 * API verified against official docs (sdk-adv, sdk-player, sdk-leaderboards).
 * Every call is guarded: game must survive SDK absence/errors.
 */
export class YandexPlatform implements IPlatform {
  readonly isReal = true;
  private ysdk: any = null;
  private player: any = null;
  private name: string | null = null;
  private authed = false;

  async init(): Promise<void> {
    if (!window.YaGames) throw new Error('YaGames missing');
    // init with timeout — don't hang boot forever
    this.ysdk = await Promise.race([
      window.YaGames.init(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('init timeout')), 8000)),
    ]);
    try {
      this.player = await this.ysdk.getPlayer({ signed: false });
      const n = this.player?.getName?.();
      if (n) this.name = n;
      // 'full' = authorized player (cloud saves + leaderboards available)
      this.authed = this.player?.getMode?.() === 'full' || !!n;
    } catch (e) {
      console.warn('[ysdk] player unavailable', e);
      this.player = null;
    }
  }

  isAuthorized(): boolean {
    return this.authed;
  }

  getLang(): Lang {
    try {
      const l = this.ysdk?.environment?.i18n?.lang as string | undefined;
      if (l?.toLowerCase().startsWith('ru')) return 'ru';
      if (['be', 'kk', 'uk', 'uz'].includes((l ?? '').toLowerCase())) return 'ru';
      return 'en';
    } catch {
      return 'en';
    }
  }

  serverTime(): number {
    try {
      const t = this.ysdk?.serverTime?.();
      return typeof t === 'number' && t > 0 ? t : Date.now();
    } catch {
      return Date.now();
    }
  }

  showInterstitial(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown: boolean) => resolve(!!wasShown),
            onError: () => resolve(false),
          },
        });
      } catch {
        resolve(false);
      }
      // safety net: never hang the game on ads
      setTimeout(() => resolve(false), 30000);
    });
  }

  showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      let rewarded = false;
      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => { rewarded = true; },
            onClose: () => resolve(rewarded),
            onError: () => resolve(false),
          },
        });
      } catch {
        resolve(false);
      }
      setTimeout(() => resolve(false), 60000);
    });
  }

  async cloudLoad(): Promise<unknown> {
    if (!this.player) return null;
    try {
      const data = await this.player.getData();
      return data ?? null;
    } catch (e) {
      console.warn('[ysdk] cloud load failed', e);
      return null;
    }
  }

  async cloudSave(data: unknown): Promise<void> {
    if (!this.player) return;
    try {
      await this.player.setData(data as Record<string, unknown>);
    } catch (e) {
      console.warn('[ysdk] cloud save failed', e);
    }
  }

  async submitScore(board: string, score: number): Promise<void> {
    try {
      if (!this.ysdk.isAvailableMethod?.('leaderboards.setScore')) return;
      const lb = await this.ysdk.getLeaderboards();
      await lb.setLeaderboardScore(board, Math.round(score));
    } catch (e) {
      console.warn('[ysdk] submit score failed', e);
    }
  }

  async getBoard(board: string): Promise<LeaderboardEntry[]> {
    try {
      const lb = await this.ysdk.getLeaderboards();
      const res = await lb.getLeaderboardEntries(board, { quantityTop: 10, includeUser: true });
      const myId = this.player?.getUniqueID?.();
      return (res.entries ?? []).map((e: any) => ({
        name: e.player?.publicName || '???',
        score: e.score ?? 0,
        rank: e.rank ?? 0,
        isPlayer: !!myId && e.player?.uniqueID === myId,
      }));
    } catch {
      return [];
    }
  }

  async auth(): Promise<string | null> {
    if (this.name) return this.name;
    try {
      await this.ysdk.auth.openAuthDialog();
      this.player = await this.ysdk.getPlayer({ signed: false });
      this.name = this.player?.getName?.() ?? null;
      this.authed = this.player?.getMode?.() === 'full' || !!this.name;
      return this.name;
    } catch {
      return null;
    }
  }

  gameplayStart(): void {
    try { this.ysdk?.features?.GameplayAPI?.start?.(); } catch { /* noop */ }
  }

  gameplayStop(): void {
    try { this.ysdk?.features?.GameplayAPI?.stop?.(); } catch { /* noop */ }
  }

  loadingReady(): void {
    try { this.ysdk?.features?.LoadingAPI?.ready?.(); } catch { /* noop */ }
  }

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

  onGamePause(cb: () => void): void {
    try { this.ysdk?.on?.('game_api_pause', cb); } catch { /* noop */ }
  }

  onGameResume(cb: () => void): void {
    try { this.ysdk?.on?.('game_api_resume', cb); } catch { /* noop */ }
  }

  async getFlags(defaults: Record<string, string>): Promise<Record<string, string>> {
    try {
      const flags = await Promise.race([
        this.ysdk.getFlags({ defaultFlags: defaults }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('flags timeout')), 5000)),
      ]) as Record<string, string>;
      return { ...defaults, ...(typeof flags === 'object' && flags ? flags : {}) };
    } catch (e) {
      console.warn('[ysdk] flags unavailable, using defaults', e);
      return { ...defaults };
    }
  }
}
