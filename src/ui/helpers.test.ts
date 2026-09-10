// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { esc, fmt, fmtSigned } from './helpers';
import { sellProceeds } from '../sim/seasonSim';
import { CONFIG } from '../config';

describe('helpers', () => {
  it('esc() neutralizes HTML injection (leaderboard names are untrusted)', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(esc('a & "b" \'c\'')).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
    expect(esc('Обычный Ник')).toBe('Обычный Ник');
  });

  it('fmt/fmtSigned produce readable numbers', () => {
    expect(fmt(1234.56)).toMatch(/1[\s,\u00a0]234[.,]6/);
    expect(fmtSigned(-5)).toBe('-5');
    expect(fmtSigned(5)).toBe('+5');
  });

  it('sellProceeds applies the platform fee', () => {
    expect(sellProceeds(10, 5)).toBeCloseTo(49, 5); // 50 − 2%
    expect(CONFIG.sellFeePct).toBeGreaterThan(0);
  });
});
