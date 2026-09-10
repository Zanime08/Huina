// DEV-ONLY debug panel (?debug=1). Dynamically imported, tree-shaken from prod.
import { saveManager } from '../meta/saveManager';
import { analytics } from '../meta/analytics';
import { el } from '../ui/helpers';
import type { Game } from '../core/Game';
import type { IPlatform } from '../platform/IPlatform';
import { MockPlatform } from '../platform/MockPlatform';
import { i18n } from '../ui/i18n';

export function attachDebug(game: Game, platform: IPlatform): void {
  const panel = el('div', '');
  panel.style.cssText = 'position:fixed;top:8px;right:8px;z-index:999;background:#000c;color:#0f0;font:11px monospace;padding:8px;border-radius:8px;display:flex;flex-direction:column;gap:4px;max-width:200px;';
  const btn = (label: string, fn: () => void) => {
    const b = el('button', '', label) as HTMLButtonElement;
    b.style.cssText = 'background:#123;color:#0f0;border:1px solid #0f0;border-radius:4px;padding:3px 6px;cursor:pointer;text-align:left;';
    b.onclick = (e) => { e.stopPropagation(); fn(); };
    panel.appendChild(b);
  };
  const fps = el('div', '', 'fps…');
  panel.appendChild(fps);
  let frames = 0; let last = performance.now();
  const count = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      fps.textContent = `fps ${frames} · state ${game.sm.current} · ${platform.isReal ? 'YA' : 'MOCK'}`;
      frames = 0; last = now;
    }
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);

  btn('+1000 🪙', () => saveManager.addCoins(1000));
  btn('unlock all memes', () => {
    import('../sim/memeRegistry').then(({ MEMES }) => {
      saveManager.data.collection = MEMES.map((m) => m.id);
      saveManager.saveAll(true);
    });
  });
  btn('max upgrades', () => {
    saveManager.data.upgrades = { cash: 4, energy: 4, luck: 4, slots: 2, insider: 3 };
    saveManager.saveAll(true);
    game.showMenu();
  });
  btn('seasonsPlayed=4 (unlock S2)', () => {
    saveManager.data.seasonsPlayed = 4;
    saveManager.saveAll(true);
    game.showMenu();
  });
  btn('seasonsPlayed=10 (unlock S3)', () => {
    saveManager.data.seasonsPlayed = 10;
    saveManager.saveAll(true);
    game.showMenu();
  });
  btn('show analytics log', () => {
    alert(analytics.log.map((e) => `${e.name} ${JSON.stringify(e.params ?? {})}`).join('\n') || '(empty)');
  });
  btn('toggle ad fail', () => {
    if (platform instanceof MockPlatform) {
      platform.simulateAdFail = !platform.simulateAdFail;
      alert('simulateAdFail=' + platform.simulateAdFail);
    } else alert('real platform');
  });
  btn('corrupt main (bak restore)', () => {
    localStorage.setItem('hype_factory_save_v1', '{broken json!!!');
    location.reload();
  });
  btn('corrupt both+reload', () => {
    localStorage.setItem('hype_factory_save_v1', '{broken!!!');
    localStorage.setItem('hype_factory_save_bak', '{broken!!!');
    location.reload();
  });
  btn('clear save+reload', () => {
    localStorage.removeItem('hype_factory_save_v1');
    localStorage.removeItem('hype_factory_save_bak');
    location.reload();
  });
  btn('toggle lang', () => {
    i18n.setLang(i18n.lang === 'ru' ? 'en' : 'ru');
    game.showMenu();
  });
  btn('force interstitial', () => { void game.ads.showInterstitial().then((r) => alert('interstitial: ' + r)); });
  btn('force rewarded', () => { void game.ads.showRewarded().then((r) => alert('rewarded: ' + r)); });
  document.body.appendChild(panel);
}
