import { COSMETICS } from '../sim/memeRegistry';
import { saveManager } from '../meta/saveManager';

/** Applies the active studio skin (CSS variables). Call on boot + on change. */
export function applyCosmetic(): void {
  const id = saveManager.data.cosmetics.active;
  const skin = COSMETICS.find((c) => c.id === id) ?? COSMETICS[0];
  const root = document.documentElement;
  root.style.setProperty('--accent', skin.accent);
  root.style.setProperty('--accent2', skin.accent2);
}
