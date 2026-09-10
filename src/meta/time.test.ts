import { describe, it, expect } from 'vitest';
import { weekKey, weeklySeed, dailySeed, todayKey } from './daily';

describe('time utils (server-time based)', () => {
  it('todayKey is UTC yyyy-mm-dd', () => {
    expect(todayKey(Date.UTC(2026, 8, 10, 23, 59))).toBe('2026-09-10');
    expect(todayKey(Date.UTC(2026, 8, 10, 0, 0))).toBe('2026-09-10');
  });

  it('weekKey returns ISO-8601 weeks', () => {
    expect(weekKey(Date.UTC(2026, 0, 1))).toBe('2026-W01');   // Thu
    expect(weekKey(Date.UTC(2026, 8, 7))).toBe('2026-W37');   // Mon
    expect(weekKey(Date.UTC(2026, 8, 10))).toBe('2026-W37');  // Thu, same week
    expect(weekKey(Date.UTC(2026, 8, 13))).toBe('2026-W37');  // Sun, same week
    expect(weekKey(Date.UTC(2026, 8, 14))).toBe('2026-W38');  // next Mon
    // 2026 starts on a Thursday → a 53-week ISO year
    expect(weekKey(Date.UTC(2026, 11, 31))).toBe('2026-W53');
  });

  it('weeklySeed is stable within a week and differs across weeks/modes', () => {
    const a = weeklySeed(Date.UTC(2026, 8, 8));
    const b = weeklySeed(Date.UTC(2026, 8, 12));
    const c = weeklySeed(Date.UTC(2026, 8, 15));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(weeklySeed(Date.UTC(2026, 8, 10))).not.toBe(dailySeed(Date.UTC(2026, 8, 10)));
  });
});
