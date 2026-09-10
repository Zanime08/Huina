import type { MemeDef } from '../sim/memeRegistry';
import { i18n } from './i18n';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls = '', html = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  const locale = i18n.lang === 'en' ? 'en-US' : 'ru-RU';
  return Number.isInteger(r) ? r.toLocaleString(locale) : r.toLocaleString(locale, { maximumFractionDigits: 1 });
}

export function fmtSigned(n: number): string {
  return (n >= 0 ? '+' : '') + fmt(n);
}

/** Escape untrusted text (leaderboard names etc.) before it goes through innerHTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));
}

let toastWrap: HTMLElement | null = null;
export function toast(msg: string, kind: '' | 'bad' | 'gold' = '', ms = 2600): void {
  if (!toastWrap) {
    toastWrap = document.getElementById('toast-wrap');
    if (!toastWrap) {
      toastWrap = el('div');
      toastWrap.id = 'toast-wrap';
      document.body.appendChild(toastWrap);
    }
  }
  const t = el('div', `toast ${kind}`, msg);
  toastWrap.appendChild(t);
  while (toastWrap.children.length > 3) toastWrap.firstChild?.remove();
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, ms - 300);
  setTimeout(() => t.remove(), ms);
}

export interface ModalButton { label: string; cls?: string; onClick?: () => void; }

export function modal(title: string, body: HTMLElement | string, buttons: ModalButton[] = []): () => void {
  const ov = el('div', 'overlay');
  const m = el('div', 'modal');
  const h = el('h2', '', title);
  m.appendChild(h);
  if (typeof body === 'string') {
    const b = el('div', '', body);
    m.appendChild(b);
  } else {
    m.appendChild(body);
  }
  const row = el('div', 'btn-row');
  row.style.marginTop = '14px';
  const close = () => ov.remove();
  for (const b of buttons) {
    const btn = el('button', `btn ${b.cls ?? 'ghost'}`, b.label);
    btn.onclick = () => { b.onClick?.(); close(); };
    row.appendChild(btn);
  }
  if (buttons.length > 0) m.appendChild(row);
  else ov.onclick = (e) => { if (e.target === ov) close(); };
  ov.appendChild(m);
  document.body.appendChild(ov);
  return close;
}

/** Procedural original avatar: gradient face + variant eyes/mouth. art by code, no assets. */
export function avatarSVG(def: MemeDef, size = 52): string {
  const h = def.hue;
  const v = def.face % 12;
  const eyes = [
    `<circle cx="18" cy="22" r="4" fill="#0d0b1e"/><circle cx="34" cy="22" r="4" fill="#0d0b1e"/><circle cx="19.5" cy="20.5" r="1.4" fill="#fff"/><circle cx="35.5" cy="20.5" r="1.4" fill="#fff"/>`,
    `<rect x="12" y="18" width="9" height="8" rx="2" fill="#0d0b1e"/><rect x="31" y="18" width="9" height="8" rx="2" fill="#0d0b1e"/>`,
    `<circle cx="18" cy="22" r="4.5" fill="#0d0b1e"/><circle cx="34" cy="22" r="4.5" fill="#0d0b1e"/><text x="18" y="25" font-size="7" text-anchor="middle" fill="#ffd23d">6</text><text x="34" y="25" font-size="7" text-anchor="middle" fill="#ffd23d">7</text>`,
    `<circle cx="18" cy="22" r="3" fill="#0d0b1e"/><circle cx="34" cy="22" r="6" fill="#0d0b1e"/><circle cx="35.5" cy="20" r="2" fill="#ff3df0"/>`,
    `<path d="M12 22 L18 16 L24 22 Z" fill="#0d0b1e"/><path d="M28 22 L34 16 L40 22 Z" fill="#0d0b1e"/>`,
    `<rect x="12" y="20" width="12" height="4" rx="2" fill="#0d0b1e"/><rect x="28" y="20" width="12" height="4" rx="2" fill="#0d0b1e"/>`,
    `<ellipse cx="18" cy="22" rx="7" ry="5" fill="#0d0b1e"/><ellipse cx="34" cy="22" rx="7" ry="5" fill="#0d0b1e"/><circle cx="18" cy="22" r="2" fill="#fff"/><circle cx="34" cy="22" r="2" fill="#fff"/>`,
    `<circle cx="18" cy="22" r="4" fill="none" stroke="#0d0b1e" stroke-width="2.5"/><circle cx="34" cy="22" r="4" fill="none" stroke="#0d0b1e" stroke-width="2.5"/>`,
    `<circle cx="18" cy="22" r="4" fill="#0d0b1e"/><circle cx="34" cy="22" r="4" fill="#0d0b1e"/><rect x="8" y="12" width="10" height="3" rx="1.5" fill="#0d0b1e" transform="rotate(-20 13 13)"/><rect x="34" y="12" width="10" height="3" rx="1.5" fill="#0d0b1e" transform="rotate(20 39 13)"/>`,
    `<circle cx="18" cy="22" r="4" fill="#0d0b1e"/><circle cx="34" cy="22" r="4" fill="#0d0b1e"/><circle cx="26" cy="10" r="5" fill="none" stroke="#ffd23d" stroke-width="2"/>`,
    `<rect x="12" y="16" width="28" height="12" rx="3" fill="#0d0b1e"/><circle cx="19" cy="22" r="2.5" fill="#3df0ff"/><circle cx="33" cy="22" r="2.5" fill="#3df0ff"/>`,
    `<circle cx="18" cy="22" r="4" fill="#0d0b1e"/><circle cx="34" cy="22" r="4" fill="#0d0b1e"/><circle cx="18" cy="22" r="1.5" fill="#ff5470"/><circle cx="34" cy="22" r="1.5" fill="#ff5470"/>`,
  ][v];
  const mouths = [
    `<path d="M18 36 Q26 44 34 36" stroke="#0d0b1e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<rect x="18" y="35" width="16" height="5" rx="2" fill="#0d0b1e"/>`,
    `<path d="M18 38 L26 34 L34 38" stroke="#0d0b1e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<circle cx="26" cy="38" r="4" fill="#0d0b1e"/>`,
    `<path d="M14 36 Q26 30 38 36" stroke="#0d0b1e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<rect x="20" y="36" width="12" height="3" rx="1.5" fill="#0d0b1e"/>`,
    `<path d="M18 36 Q26 42 34 36 M22 36 L22 40 M30 36 L30 40" stroke="#0d0b1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M16 38 Q26 34 36 38" stroke="#0d0b1e" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="3 2"/>`,
    `<path d="M18 37 L34 37" stroke="#0d0b1e" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M20 36 Q26 40 32 36" stroke="#0d0b1e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<rect x="22" y="34" width="8" height="8" rx="2" fill="#0d0b1e"/>`,
    `<text x="26" y="41" font-size="9" text-anchor="middle" fill="#0d0b1e" font-weight="900">?</text>`,
  ][v];
  const extra = v === 2 ? `<text x="26" y="10" font-size="8" text-anchor="middle" fill="#fff" font-weight="900">67</text>`
    : v === 5 ? `<rect x="6" y="4" width="40" height="6" rx="3" fill="#0d0b1e" opacity=".55"/>`
    : v === 9 ? `<circle cx="26" cy="26" r="20" fill="none" stroke="#ffd23d" stroke-width="1.5" opacity=".7"/>` : '';
  const rarityRing = def.rarity === 'legendary' ? '#ffd23d' : def.rarity === 'epic' ? '#ff3df0' : def.rarity === 'rare' ? '#3df0ff' : 'transparent';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" width="${size}" height="${size}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},70%,55%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},75%,38%)"/></linearGradient></defs>`
    + `<rect x="1" y="1" width="50" height="50" rx="13" fill="url(#g)" stroke="${rarityRing}" stroke-width="3"/>`
    + extra + eyes + mouths + `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function drawSpark(canvas: HTMLCanvasElement, history: number[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width = canvas.clientWidth * 2 || 200;
  const h = canvas.height = 52;
  ctx.clearRect(0, 0, w, h);
  if (history.length < 2) return;
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - 4 - (v / 100) * (h - 10);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#3df0ff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(61,240,255,.35)');
  grad.addColorStop(1, 'rgba(61,240,255,0)');
  ctx.fillStyle = grad;
  ctx.fill();
}
