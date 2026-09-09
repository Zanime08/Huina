import { el, fmt, toast, modal, avatarSVG } from '../helpers';
import { i18n } from '../i18n';
import { audio } from '../../audio/audioManager';
import { saveManager } from '../../meta/saveManager';
import { UPGRADES, ACHIEVEMENTS, MEMES, memeById } from '../../sim/memeRegistry';
import { upgradeCost, studioTier, STUDIO_EMOJI } from '../../sim/economy';

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
  constructor(onBack: () => void) {
    const root = el('div', 'screen');
    root.appendChild(topbar(i18n.t('upg_title'), onBack));
    const tier = studioTier(saveManager.data);
    const names = i18n.arr('upg_studio_names');
    const sv = el('div', 'studio-visual');
    sv.innerHTML = `<div class="studio-emoji">${STUDIO_EMOJI[tier]}</div><div><b>${names[tier] ?? ''}</b></div>`;
    root.appendChild(sv);
    const list = el('div', 'screen');
    list.style.padding = '0';
    const render = () => {
      list.innerHTML = '';
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
          audio.buy();
          toast(`⬆ ${nm} → ${i18n.t('upg_level')}${lv + 1}`, 'gold');
          // re-render whole screen coins + list
          root.innerHTML = '';
          root.appendChild(topbar(i18n.t('upg_title'), onBack));
          root.appendChild(sv);
          root.appendChild(list);
          render();
        };
        row.appendChild(btn);
        list.appendChild(row);
      }
    };
    render();
    root.appendChild(list);
    this.root = root;
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
      item.appendChild(el('div', 'muted', found ? tag : '🔒'));
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
    void memeById;
    this.root = root;
  }
  destroy(): void { this.root.remove(); }
}

export class SettingsScreen {
  readonly root: HTMLElement;
  constructor(onBack: () => void, onLang: () => void) {
    const s = saveManager.data.settings;
    const root = el('div', 'screen');
    root.appendChild(topbar(i18n.t('set_title'), onBack, false));
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
  destroy(): void { this.root.remove(); }
}
