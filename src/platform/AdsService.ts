import { CONFIG } from '../config';
import type { IPlatform } from './IPlatform';

/**
 * Single choke point for ads.
 * - Interstitial: only from natural pauses (results screen), min interval of ACTIVE play.
 * - Rewarded: only via explicit user opt-in; reward granted ONLY on success resolve.
 * - Game audio/sim must be paused by the caller around these awaits.
 */
export class AdsService {
  private activePlaySec = 0;
  private lastInterstitialAt = -1e9;
  private busy = false;

  constructor(private platform: IPlatform) {}

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
    try {
      const shown = await this.platform.showInterstitial();
      if (shown) this.lastInterstitialAt = this.activePlaySec;
      return shown;
    } finally {
      this.busy = false;
    }
  }

  async showRewarded(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      return await this.platform.showRewarded();
    } finally {
      this.busy = false;
    }
  }
}
