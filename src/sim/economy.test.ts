import { describe, it, expect } from 'vitest';
import { defaultSave } from '../meta/saveManager';
import { upgradeEffects, goalForSeason, rewardForResult, upgradeCost, seasonNumber } from './economy';

describe('economy', () => {
  it('base effects match config', () => {
    const fx = upgradeEffects(defaultSave());
    expect(fx.startCash).toBe(100);
    expect(fx.slots).toBe(3);
    expect(fx.maxEnergy).toBe(3);
    expect(fx.luck).toBe(0);
  });

  it('upgrades improve effects', () => {
    const d = defaultSave();
    d.upgrades = { cash: 2, energy: 4, luck: 1, slots: 1, insider: 2 };
    const fx = upgradeEffects(d);
    expect(fx.startCash).toBe(220);
    expect(fx.maxEnergy).toBe(5);
    expect(fx.slots).toBe(4);
    expect(fx.luck).toBeCloseTo(0.12, 5);
    expect(fx.insider).toBe(2);
  });

  it('goals grow per season', () => {
    expect(goalForSeason(1)).toBe(150);
    expect(goalForSeason(2)).toBeGreaterThan(150);
  });

  it('season number = played + 1', () => {
    const d = defaultSave();
    d.seasonsPlayed = 3;
    expect(seasonNumber(d)).toBe(4);
  });

  it('rewards: lose < win, more stars = more', () => {
    const lose = rewardForResult(false, 0);
    const w1 = rewardForResult(true, 1);
    const w3 = rewardForResult(true, 3);
    expect(w1).toBeGreaterThan(lose);
    expect(w3).toBeGreaterThan(w1);
  });

  it('upgrade costs end at max level', () => {
    expect(upgradeCost('cash', 0)).toBe(120);
    expect(upgradeCost('cash', 4)).toBeNull();
    expect(upgradeCost('slots', 2)).toBeNull();
  });
});
