// @vitest-environment happy-dom
// Full-flow integration test: menu → season → actions → results → retry → meta screens.
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { MockPlatform } from '../platform/MockPlatform';
import { saveManager } from '../meta/saveManager';

function q<T extends HTMLElement = HTMLElement>(sel: string): T {
  const e = document.querySelector(sel) as T | null;
  if (!e) throw new Error(`missing element: ${sel}`);
  return e;
}

function qa(sel: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(sel) as NodeListOf<HTMLElement>);
}

function click(e: Element | null | undefined): void {
  if (!e) throw new Error('click target missing');
  (e as HTMLElement).click();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('game smoke flow', () => {
  let game: Game;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div><div id="toast-wrap"></div>';
    localStorage.clear();
    saveManager.loadLocal();
    game = new Game(new MockPlatform());
    game.applyLang();
  });

  it('menu renders and starts a season', () => {
    game.showMenu();
    expect(document.body.textContent).toContain('HYPE');
    expect(game.sm.current).toBe('MENU');
    q<HTMLButtonElement>('.btn.primary').click();
    expect(game.sm.current).toBe('PLAYING');
    expect(qa('.meme-card').length).toBe(3);
    expect(q('.hud-day').textContent).toContain('1/10');
  });

  it('farm and sell change cash', () => {
    game.showMenu();
    q<HTMLButtonElement>('.btn.primary').click();
    const screen = (game as unknown as { current: { s: { cash: number } } }).current;
    const before = screen.s.cash;
    click(qa('.meme-card')[0].querySelector('.act.farm'));
    expect(screen.s.cash).toBeLessThan(before);
    click(qa('.meme-card')[0].querySelectorAll('.act.sell')[1]);
  });

  it('season ends with results screen, retry works', async () => {
    game.showMenu();
    q<HTMLButtonElement>('.btn.primary').click();
    const screen = (game as unknown as { current: { s: { day: number; dayT: number; cash: number } } }).current;
    screen.s.day = 10;
    screen.s.dayT = 0.999;
    screen.s.cash = 500; // force a win
    await sleep(400);
    expect(game.sm.current).toBe('RESULTS');
    expect(q('.result-profit').textContent).toBeTruthy();
    expect(saveManager.data.coins).toBeGreaterThan(0);
    // retry → new season
    q<HTMLButtonElement>('.btn.primary').click();
    expect(game.sm.current).toBe('PLAYING');
    expect(qa('.meme-card').length).toBe(3);
  }, 10000);

  it('pause menu quits to results', async () => {
    game.showMenu();
    q<HTMLButtonElement>('.btn.primary').click();
    q<HTMLButtonElement>('.icon-btn').click(); // pause
    await sleep(50);
    const btns = qa('.modal .btn');
    expect(btns.length).toBe(3);
    btns[2].click(); // quit
    expect(game.sm.current).toBe('RESULTS');
  });

  it('meta screens render and upgrade purchase works', () => {
    saveManager.addCoins(1000);
    game.showMenu();
    // upgrades screen is 2nd button in first row
    click(qa('.btn-row')[0].querySelectorAll('.btn')[1]);
    expect(qa('.upg').length).toBe(5);
    const lvBefore = saveManager.data.upgrades['cash'] ?? 0;
    click(qa('.upg')[0].querySelector('button'));
    expect((saveManager.data.upgrades['cash'] ?? 0)).toBe(lvBefore + 1);
  });

  it('collection, achievements, settings render; lang switch works', () => {
    game.showMenu();
    click(qa('.btn-row')[1].querySelectorAll('.btn')[0]); // collection
    expect(qa('.coll-item').length).toBe(12);
    game.showMenu();
    click(qa('.btn-row')[1].querySelectorAll('.btn')[1]); // achievements
    expect(qa('.ach').length).toBe(12);
    game.showMenu();
    click(qa('.btn-row')[1].querySelectorAll('.btn')[2]); // settings
    const sel = q<HTMLSelectElement>('select');
    sel.value = 'en';
    sel.dispatchEvent(new Event('change'));
    expect(document.body.textContent).toContain('Start season');
  });
});
