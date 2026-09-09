import { hashSeed } from '../core/rng';

export function todayKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailySeed(nowMs: number): number {
  return hashSeed('hype-daily-' + todayKey(nowMs));
}
