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

/** ISO-8601 week key, e.g. "2026-W37". Same for everyone within the week (UTC). */
export function weekKey(nowMs: number): string {
  const d = new Date(nowMs);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  t.setUTCDate(t.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = t.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((t.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** One shared seed per ISO week → all competitors play the exact same market. */
export function weeklySeed(nowMs: number): number {
  return hashSeed('hype-weekly-' + weekKey(nowMs));
}

/**
 * Month (1–12) of an ISO week, derived from the week key itself — NOT from the
 * wall clock. Everyone playing the same weekly seed gets the same seasonal
 * event pool, even if the week straddles two months.
 */
export function monthForKey(wk: string): number {
  const parts = wk.split('-W');
  const y = parseInt(parts[0], 10);
  const w = parseInt(parts[1] ?? '1', 10);
  return new Date(Date.UTC(y, 0, 1 + (w - 1) * 7 + 3)).getUTCMonth() + 1;
}
