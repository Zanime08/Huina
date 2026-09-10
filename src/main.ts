// BOOT → SDK init → saves → Game
import './style.css';
import { Game } from './core/Game';
import { saveManager } from './meta/saveManager';
import { analytics } from './meta/analytics';
import { applyRemoteFlags, DEFAULT_FLAGS, flagsSnapshot } from './meta/remoteConfig';
import { MockPlatform } from './platform/MockPlatform';
import { YandexPlatform } from './platform/YandexPlatform';
import type { IPlatform } from './platform/IPlatform';
import { audio } from './audio/audioManager';
import { applyCosmetic } from './ui/cosmetics';

function setBoot(pct: number, text: string): void {
  const fill = document.getElementById('bootFill');
  const t = document.getElementById('bootText');
  if (fill) fill.style.width = `${pct}%`;
  if (t) t.textContent = text;
}

// Global error boundary: never die silently, never show stack to players.
window.addEventListener('error', (e) => {
  console.error('[fatal]', e.message, e.filename, e.lineno);
  try { analytics.event('js_error', { msg: String(e.message).slice(0, 120) }); } catch { /* noop */ }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandled]', e.reason);
  try { analytics.event('js_error', { msg: String(e.reason).slice(0, 120) }); } catch { /* noop */ }
});

async function boot(): Promise<void> {
  analytics.configure();
  const bootT = Date.now();
  // session duration — fired once when the tab/game is hidden or closed
  const reportSession = () => {
    try { analytics.event('session_end', { sec: Math.round((Date.now() - bootT) / 1000) }); } catch { /* noop */ }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) reportSession(); });
  window.addEventListener('pagehide', reportSession);
  setBoot(15, 'SDK…');
  let platform: IPlatform;
  try {
    if (!window.YaGames) throw new Error('no YaGames global');
    const yp = new YandexPlatform();
    await yp.init();
    platform = yp;
    console.log('[boot] Yandex platform ready');
  } catch (e) {
    console.warn('[boot] Yandex SDK unavailable, using mock:', e);
    platform = new MockPlatform();
    await platform.init();
  }

  setBoot(45, 'Saves…');
  saveManager.loadLocal();
  saveManager.attachCloud(
    () => platform.cloudLoad(),
    (d) => platform.cloudSave({ ...d }),
  );
  await saveManager.loadCloud();

  setBoot(55, 'Config…');
  // Remote Config: Yandex console flags → live tuning (prices, ad pace, events).
  try {
    const flags = await platform.getFlags(DEFAULT_FLAGS);
    applyRemoteFlags(flags);
    analytics.event('flags_applied', { ...flagsSnapshot(), real: platform.isReal });
  } catch (e) {
    console.warn('[boot] flags failed, defaults kept', e);
  }

  setBoot(70, 'Audio…');
  applyCosmetic();
  const unlockOnce = () => {
    audio.unlock();
    audio.applySettings();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);

  setBoot(90, 'Game…');
  const game = new Game(platform);
  game.applyLang();
  (window as unknown as { __game?: Game }).__game = game;

  game.showMenu();
  platform.loadingReady();
  analytics.event('game_start', { platform: platform.isReal ? 'yandex' : 'mock' });

  // Service worker (offline requirement) — register after first paint
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('[boot] SW registration failed', e);
    }
  }
  setBoot(100, 'OK');

  // Debug panel: dev-only, loaded dynamically so it's tree-shaken from prod
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(location.search);
    if (params.has('debug')) {
      const { attachDebug } = await import('./debug/debugPanel');
      attachDebug(game, platform);
    }
  }
}

void boot();
