import { describe, it, expect, afterEach } from 'vitest';
import { applyRemoteFlags, resetRemoteFlags, cosmeticPrice, DEFAULT_FLAGS, flagsSnapshot } from './remoteConfig';
import { CONFIG } from '../config';
import { seasonalWeight } from '../sim/seasonSim';
import type { EventDef } from '../sim/memeRegistry';

const halloween: EventDef = { id: 'h', weight: 10, minDay: 1, kind: 'good', target: 'random', hype: 10, months: [10], text: { ru: '', en: '' } };

afterEach(() => resetRemoteFlags());

describe('remote config (Yandex flags)', () => {
  it('defaults match CONFIG', () => {
    expect(DEFAULT_FLAGS.adCooldownSec).toBe('180');
    resetRemoteFlags();
    expect(CONFIG.adCooldownSec).toBe(180);
  });

  it('applies server values with clamping', () => {
    applyRemoteFlags({ adCooldownSec: '90', cosmeticPricePct: '50' });
    expect(CONFIG.adCooldownSec).toBe(90);
    expect(cosmeticPrice(700)).toBe(350);
    // out-of-range console edits are clamped, not trusted
    applyRemoteFlags({ adCooldownSec: '1', weeklyBonus: '99999', cosmeticPricePct: '-50' });
    expect(CONFIG.adCooldownSec).toBe(60);
    expect(CONFIG.weeklyBonus).toBe(500);
    expect(cosmeticPrice(400)).toBe(200);
    // garbage falls back to the current value
    applyRemoteFlags({ dailyBonus: 'abc' });
    expect(CONFIG.dailyBonus).toBe(50);
  });

  it('ignores unknown keys and never throws', () => {
    expect(() => applyRemoteFlags({ hack: '999', evil: 'cmd' })).not.toThrow();
    expect(flagsSnapshot().dailyBonus).toBe('50');
  });

  it('seasonalBoost is remote-tunable', () => {
    expect(seasonalWeight(halloween, 10)).toBe(3);
    applyRemoteFlags({ seasonalBoost: '5' });
    expect(seasonalWeight(halloween, 10)).toBe(5);
    applyRemoteFlags({ seasonalBoost: '1' });
    expect(seasonalWeight(halloween, 10)).toBe(1);
  });

  it('reset restores defaults after experiments', () => {
    applyRemoteFlags({ cosmeticPricePct: '200', seasonalBoost: '1', adCooldownSec: '600' });
    resetRemoteFlags();
    expect(cosmeticPrice(700)).toBe(700);
    expect(CONFIG.adCooldownSec).toBe(180);
    expect(seasonalWeight(halloween, 10)).toBe(3);
  });
});
