// Synthesized audio: zero external assets, zero licenses.
import { saveManager } from '../meta/saveManager';

type OscType = OscillatorType;

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private step = 0;

  /** Must be called from a user gesture at least once. */
  unlock(): void {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private get enabled(): boolean {
    return !saveManager.data.settings.muted;
  }

  private out(kind: 'music' | 'sfx'): GainNode | null {
    if (!this.ctx || !this.enabled) return null;
    const g = this.ctx.createGain();
    g.gain.value = kind === 'music' ? saveManager.data.settings.music : saveManager.data.settings.sfx;
    g.connect(this.ctx.destination);
    return g;
  }

  private tone(freq: number, dur: number, type: OscType = 'square', vol = 0.2, when = 0, slideTo?: number): void {
    const ctx = this.ctx;
    const out = this.out('sfx');
    if (!ctx || !out) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  click(): void { this.tone(660, 0.07, 'square', 0.12); }
  buy(): void { this.tone(520, 0.09, 'square', 0.16); this.tone(780, 0.1, 'square', 0.16, 0.07); }
  sell(): void { this.tone(880, 0.1, 'triangle', 0.22); this.tone(1320, 0.14, 'triangle', 0.2, 0.08); }
  error(): void { this.tone(160, 0.18, 'sawtooth', 0.16); }
  boost(): void { this.tone(300, 0.25, 'sawtooth', 0.14, 0, 1200); }
  newsGood(): void { this.tone(740, 0.09, 'sine', 0.2); this.tone(990, 0.12, 'sine', 0.2, 0.09); }
  newsBad(): void { this.tone(330, 0.14, 'sine', 0.22); this.tone(220, 0.2, 'sine', 0.22, 0.12); }
  legend(): void {
    this.tone(200, 0.5, 'sawtooth', 0.16, 0, 1600);
    this.tone(1200, 0.3, 'triangle', 0.2, 0.25);
    this.tone(1600, 0.4, 'triangle', 0.18, 0.45);
  }
  win(): void {
    const seq = [523, 659, 784, 1046, 1318];
    seq.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, i * 0.11));
  }
  lose(): void {
    const seq = [440, 392, 330, 262];
    seq.forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.16));
  }
  dayTick(): void { this.tone(980, 0.06, 'sine', 0.1); }

  /** Mute/unmute music loop immediately. */
  applySettings(): void {
    if (!this.enabled || saveManager.data.settings.music <= 0.01) this.stopMusic();
    else if (!this.musicTimer) this.startMusic();
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer || !this.enabled) return;
    // tiny chiptune loop: bass + arp, scheduled per 8th note
    const bass = [110, 110, 130.8, 98];
    const arp = [440, 523.25, 659.25, 523.25, 587.33, 659.25, 880, 659.25];
    this.musicTimer = setInterval(() => {
      const out = this.out('music');
      const ctx = this.ctx;
      if (!ctx || !out) return;
      const s = this.step++;
      const mk = (freq: number, dur: number, type: OscType, vol: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        const t = ctx.currentTime;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(t + dur + 0.02);
      };
      if (s % 2 === 0) mk(bass[(s / 2) % 4 | 0], 0.22, 'triangle', 0.16);
      mk(arp[s % arp.length], 0.11, 'square', 0.045);
    }, 175);
  }

  stopMusic(): void {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (this.musicNodes) {
      try { this.musicNodes.gain.disconnect(); } catch { /* noop */ }
      this.musicNodes = null;
    }
  }
}

export const audio = new AudioManager();
