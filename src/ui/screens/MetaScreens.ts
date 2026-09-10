import { el, fmt, toast, modal, avatarSVG } from '../helpers';
import { i18n } from '../i18n';
import { audio } from '../../audio/audioManager';
import { saveManager } from '../../meta/saveManager';
import { analytics } from '../../meta/analytics';
import { UPGRADES, ACHIEVEMENTS, MEMES, COSMETICS } from '../../sim/memeRegistry';
import { upgradeCost, studioTier, STUDIO_EMOJI } from '../../sim/economy';
import { applyCosmetic } from '../cosmetics';
import type { IPlatform } from '../../platform/IPlatform';

function topbar(title: string, onBack: () => void, coins = true): HTMLElement {
  const bar = el('div', 'topbar');
  const back = el('button', 'icon-btn', '←');
  back.onclick = () => { audio.click(); onBack(); };
  bar.appendChild(back);
  bar.appendChild(el('h2', '', title));
  if (coins) bar.appendChild(el('div', 'coins-pill', `🪙${fmt(saveManager.data.coins)}`));
  return bar;
}

export class UpgradesScreen {
  readonly root: HTMLElement;
  constructor(private onBack: () => void) {
    const root = el('div', 'screen');
    this.root = root;
    this.render();
  }

  private render(): void {
    const root = this.root;
    root.innerHTML = '';
    root.appendChild(topbar(i18n.t('upg_title'), this.onBack));
    const tier = studioTier(saveManager.data);
    const names = i18n.arr('upg_studio_names');
    const sv = el('div', 'studio-visual');
    sv.innerHTML = `<div class="studio-emoji">${STUDIO_EMOJI[tier]}</div><div><b>${names[tier] ?? ''}</b></div>`;
    root.appendChild(sv);

    for (const u of UPGRADES) {
      const lv = saveManager.data.upgrades[u.id] ?? 0;
      const cost = upgradeCost(u.id, lv);
      const row = el('div', 'upg');
      const info = el('div', 'upg-info');
      const nm = i18n.lang === 'ru' ? u.name.ru : u.name.en;
      const ds = i18n.lang === 'ru' ? u.desc.ru : u.desc.en;
      info.append(
        el('div', 'upg-name', `${nm} <span class="upg-lvl">${i18n.t('upg_level')}${lv}/${u.maxLevel}</span>`),
        el('div', 'upg-desc', ds),
      );
      const pips = el('div', 'pips');
      for (let i = 0; i < u.maxLevel; i++) pips.appendChild(el('div', `pip${i < lv ? ' on' : ''}`));
      info.appendChild(pips);
      row.appendChild(info);
      const btn = el('button', 'btn small', cost === null ? i18n.t('upg_max') : i18n.t('upg_buy', { n: `🪙${fmt(cost)}` })) as HTMLButtonElement;
      btn.style.flex = '0 0 auto';
      btn.style.width = 'auto';
      btn.disabled = cost === null || saveManager.data.coins < cost;
      btn.onclick = () => {
        if (cost === null) return;
        if (saveManager.data.coins < cost) { audio.error(); return; }
        saveManager.addCoins(-cost);
        saveManager.data.upgrades[u.id] = lv + 1;
        saveManager.saveAll();
        analytics.event('upgrade_buy', { id: u.id, lv: lv + 1 });
        audio.buy();
        toast(`⬆ ${nm} → ${i18n.t('upg_level')}${lv + 1}`, 'gold');
        this.render();
      };
      row.appendChild(btn);
      root.appendChild(row);
    }

    // --- cosmetics shop ---
    root.appendChild(el('h2', '', i18n.t('cos_title')));
    const grid = el('div', 'cos-grid');
    const cos = saveManager.data.cosmetics;
    for (const skin of COSMETICS) {
      const owned = cos.owned.includes(skin.id);
      const active = cos.active === skin.id;
      const item = el('div', `cos-item${active ? ' active' : ''}`);
      const sw = el('div', 'cos-swatch');
      sw.style.background = `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})`;
      item.appendChild(sw);
      item.appendChild(el('div', 'cos-name', i18n.lang === 'ru' ? skin.name.ru : skin.name.en));
      const btn = el('button', 'btn small', active ? `✓ ${i18n.t('cos_active')}` : owned ? i18n.t('cos_use') : `🪙${fmt(skin.cost)}`) as HTMLButtonElement;
      btn.style.marginTop = '6px';
      btn.disabled = active || (!owned && saveManager.data.coins < skin.cost);
      btn.onclick = () => {
        if (!owned) {
          if (saveManager.data.coins < skin.cost) { audio.error(); return; }
          saveManager.addCoins(-skin.cost);
          cos.owned.push(skin.id);
          analytics.event('cosmetic_buy', { id: skin.id });
        }
        cos.active = skin.id;
        saveManager.saveAll();
        applyCosmetic();
        analytics.event('cosmetic_use', { id: skin.id });
        audio.buy();
        this.render();
      };
      item.appendChild(btn);
      grid.appendChild(item);
    }
    root.appendChild(grid);
  }
  destroy(): void { this.root.remove(); }
}

export class CollectionScreen {
  readonly root: HTMLElement;
  constructor(onBack: () => void) {
    const root = el('div', 'screen');
    root.appendChild(topbar(i18n.t('coll_title'), onBack, false));
    const d = saveManager.data;
    root.appendChild(el('div', 'center muted', i18n.t('coll_found', { a: d.collection.length, b: MEMES.length })));
    const grid = el('div', 'coll-grid');
    for (const m of MEMES) {
      const found = d.collection.includes(m.id);
      const item = el('div', `coll-item${found ? '' : ' locked'}`);
      const img = document.createElement('img');
      img.className = 'avatar';
      img.src = found ? avatarSVG(m) : avatarSVG({ ...m, hue: 0 });
      img.alt = '';
      item.appendChild(img);
      item.appendChild(el('div', '', found ? (i18n.lang === 'ru' ? m.name.ru : m.name.en) : i18n.t('coll_locked')));
      const tag = m.rarity === 'legendary' ? '🟡' : m.rarity === 'epic' ? '🟣' : m.rarity === 'rare' ? '🔵' : '⚪';
      item.appendChild(el('div', 'muted', found ? `${tag} S${m.seasons[0]}` : '🔒'));
      grid.appendChild(item);
    }
    root.appendChild(grid);
    this.root = root;
  }
  destroy(): void { this.root.remove(); }
}

export class AchievementsScreen {
  readonly root: HTMLElement;
  constructor(onBack: () => void) {
    const root = el('div', 'screen');
    root.appendChild(topbar(i18n.t('ach_title'), onBack, false));
    const d = saveManager.data;
    for (const a of ACHIEVEMENTS) {
      const has = d.achievements.includes(a.id);
      const row = el('div', `ach${has ? '' : ' locked'}`);
      row.appendChild(el('div', 'ic', has ? a.icon : '🔒'));
      const info = el('div', '');
      info.append(
        el('div', 'ach-name', (i18n.lang === 'ru' ? a.name.ru : a.name.en) + ` · 🪙${a.reward}`),
        el('div', 'ach-desc', i18n.lang === 'ru' ? a.desc.ru : a.desc.en),
      );
      row.appendChild(info);
      root.appendChild(row);
    }
    this.root = root;
  }
  destroy(): void { this.root.remove(); }
}

export class SettingsScreen {
  readonly root: HTMLElement;
  constructor(onBack: () => void, onLang: () => void, private platform?: IPlatform) {
    const s = saveManager.data.settings;
    const root = el('div', 'screen');
    root.appendChild(topbar(i18n.t('set_title'), onBack, false));
    // account / cloud saves row (only on the real platform — mock needs no login)
    if (this.platform?.isReal) {
      const accCard = el('div', 'card');
      this.renderAccount(accCard);
      if (accCard.children.length > 0) root.appendChild(accCard);
    }
    const card = el('div', 'card');

    const langRow = el('div', 'settings-row');
    langRow.appendChild(el('span', '', i18n.t('set_lang')));
    const sel = document.createElement('select');
    const opts: Array<[string, string]> = [['auto', '🌐 Auto'], ['ru', '🇷🇺 Русский'], ['en', '🇺🇸 English']];
    for (const [v, label] of opts) {
      const o = document.createElement('option');
      o.value = v; o.textContent = label;
      if (s.lang === v) o.selected = true;
      sel.appendChild(o);
    }
    sel.onchange = () => {
      s.lang = sel.value as 'ru' | 'en' | 'auto';
      saveManager.saveAll();
      onLang();
    };
    langRow.appendChild(sel);
    card.appendChild(langRow);

    const slider = (label: string, val: number, fn: (v: number) => void) => {
      const row = el('div', 'settings-row');
      row.appendChild(el('span', '', label));
      const r = document.createElement('input');
      r.type = 'range'; r.min = '0'; r.max = '100'; r.value = String(Math.round(val * 100));
      r.oninput = () => { fn(Number(r.value) / 100); saveManager.saveAll(); };
      row.appendChild(r);
      card.appendChild(row);
    };
    slider(`🎵 ${i18n.t('set_music')}`, s.music, (v) => { s.music = v; audio.applySettings(); });
    slider(`🔊 ${i18n.t('set_sfx')}`, s.sfx, (v) => { s.sfx = v; audio.click(); });

    const muteRow = el('div', 'settings-row');
    muteRow.appendChild(el('span', '', `🔇 ${i18n.t('set_mute')}`));
    const muteBtn = el('button', 'btn small', s.muted ? 'ON' : 'OFF') as HTMLButtonElement;
    muteBtn.style.width = 'auto';
    muteBtn.onclick = () => {
      s.muted = !s.muted;
      muteBtn.textContent = s.muted ? 'ON' : 'OFF';
      saveManager.saveAll();
      audio.applySettings();
    };
    muteRow.appendChild(muteBtn);
    card.appendChild(muteRow);
    root.appendChild(card);

    const reset = el('button', 'btn ghost small', `🗑 ${i18n.t('set_reset')}`);
    reset.onclick = () => {
      modal(i18n.t('set_reset'), i18n.t('set_reset_confirm'), [
        { label: i18n.t('set_yes'), cls: '', onClick: () => { saveManager.reset(); location.reload(); } },
        { label: i18n.t('set_no'), cls: 'primary', onClick: () => undefined },
      ]);
    };
    root.appendChild(reset);
    this.root = root;
  }

  /** Login row for the real platform: cloud saves + leaderboards need authorization. */
  private renderAccount(card: HTMLElement): void {
    if (!this.platform) return;
    if (this.platform.isAuthorized()) return; // already logged in — nothing to sell here
    const row = el('div', 'settings-row');
    row.appendChild(el('span', '', i18n.t('set_account')));
    const login = el('button', 'btn small', i18n.t('auth_login')) as HTMLButtonElement;
    login.style.width = 'auto';
    login.onclick = async () => {
      audio.click();
      login.disabled = true;
      const name = await this.platform?.auth();
      if (name) {
        saveManager.saveAll(true); // push local progress to the fresh cloud slot
        toast(i18n.t('auth_hello', { n: name }), 'gold');
        audio.sell();
      } else {
        toast(i18n.t('auth_fail'), 'bad');
        audio.error();
        login.disabled = false;
      }
    };
    row.appendChild(login);
    card.appendChild(row);
    const hint = el('div', 'muted', i18n.t('set_login_hint'));
    hint.style.fontSize = '11px';
    card.appendChild(hint);
  }

  destroy(): void { this.root.remove(); }
}
