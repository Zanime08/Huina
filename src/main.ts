// BOOT → SDK init → saves → Game
import './style.css';
import { Game } from './core/Game';
import { saveManager } from './meta/saveManager';
import { MockPlatform } from './platform/MockPlatform';
import { YandexPlatform } from './platform/YandexPlatform';
import type { IPlatform } from './platform/IPlatform';
import { audio } from './audio/audioManager';

function setBoot(pct: number, text: string): void {
  const fill = document.getElementById('bootFill');
  const t = document.getElementById('bootText');
  if (fill) fill.style.width = `${pct}%`;
  if (t) t.textContent = text;
}

async function boot(): Promise<void> {
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

  setBoot(70, 'Audio…');
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

  // Yandex draft preview support: ?playtest param etc. — nothing special needed.
  game.showMenu();
  platform.loadingReady();

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
