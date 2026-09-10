import { CONFIG } from '../config';
import type { IPlatform } from './IPlatform';

export interface AdsHooks {
  /** Called right before any ad is requested: mute audio / pause sim. */
  before?(): void;
  /** Called after the ad settles (shown, skipped or failed): restore audio. */
  after?(): void;
}

/**
 * Single choke point for ads.
 * - Interstitial: only from natural pauses (results screen), min interval of ACTIVE play.
 * - Rewarded: only via explicit user opt-in; reward granted ONLY on success resolve.
 * - Audio is muted via hooks for the duration of every ad (Yandex requirement).
 */
export class AdsService {
  private activePlaySec = 0;
  private lastInterstitialAt = -1e9;
  private busy = false;

  constructor(private platform: IPlatform, private hooks: AdsHooks = {}) {}

  /** Call every frame with dt while in PLAYING state. */
  trackPlay(dt: number): void {
    this.activePlaySec += dt;
  }

  canShowInterstitial(): boolean {
    return this.activePlaySec - this.lastInterstitialAt >= CONFIG.adCooldownSec;
  }

  async showInterstitial(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.hooks.before?.();
    try {
      const shown = await this.platform.showInterstitial();
      if (shown) this.lastInterstitialAt = this.activePlaySec;
      return shown;
    } finally {
      this.busy = false;
      this.hooks.after?.();
    }
  }

  async showRewarded(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.hooks.before?.();
    try {
      return await this.platform.showRewarded();
    } finally {
      this.busy = false;
      this.hooks.after?.();
    }
  }
}
