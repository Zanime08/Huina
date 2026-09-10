import { el, fmt, fmtSigned } from '../helpers';
import { i18n } from '../i18n';
import { saveManager } from '../../meta/saveManager';
import { goalForSeason, seasonNumber, studioTier, STUDIO_EMOJI, contentSeason, contentSeasonName } from '../../sim/economy';
import { SEASONS, ACHIEVEMENTS } from '../../sim/memeRegistry';
import { audio } from '../../audio/audioManager';
import type { IPlatform } from '../../platform/IPlatform';

export interface MenuCallbacks {
  onPlay(): void;
  onDaily(): void;
  onUpgrades(): void;
  onCollection(): void;
  onAchievements(): void;
  onSettings(): void;
  onHow(): void;
}

export class MenuScreen {
  readonly root: HTMLElement;

  constructor(platform: IPlatform, cb: MenuCallbacks) {
    void platform;
    const d = saveManager.data;
    const goal = goalForSeason(seasonNumber(d));
    const tier = studioTier(d);
    const studioNames = i18n.arr('upg_studio_names');
    const cs = contentSeason(d);
    const seasonLabel = i18n.t('menu_season_fmt', { n: seasonNumber(d), t: contentSeasonName(d, i18n.lang) });

    const root = el('div', 'screen');
    root.appendChild(el('h1', 'logo', 'HYPE<br/>FACTORY'));
    root.appendChild(el('p', 'subtitle', i18n.t('app_subtitle')));

    const studio = el('div', 'studio-visual');
    let extra = '';
    if (d.streak.count > 0) extra += `<div>${i18n.t('menu_streak', { n: d.streak.count })}</div>`;
    const next = SEASONS.find((s) => s.season === cs + 1);
    if (next) extra += `<div class="muted" style="font-size:12px">${i18n.t('next_season_pool', { n: next.unlockAfter - d.seasonsPlayed })}</div>`;
    studio.innerHTML = `<div class="studio-emoji">${STUDIO_EMOJI[tier]}</div>
      <div><b>${studioNames[tier] ?? ''}</b> · ${seasonLabel}</div>
      <div>🎯 ${i18n.t('menu_goal', { n: fmtSigned(goal) })} · ⭐ ${i18n.t('menu_best')}: <b>${fmt(d.best)}</b></div>${extra}`;
    root.appendChild(studio);

    const play = el('button', 'btn primary', i18n.t('menu_play'));
    play.onclick = () => { audio.unlock(); audio.click(); cb.onPlay(); };
    root.appendChild(play);

    const row1 = el('div', 'btn-row');
    const daily = el('button', 'btn ghost', i18n.t('menu_daily'));
    daily.onclick = () => { audio.unlock(); audio.click(); cb.onDaily(); };
    const upg = el('button', 'btn ghost', `${i18n.t('menu_upgrades')} · 🪙${fmt(d.coins)}`);
    upg.onclick = () => { audio.unlock(); audio.click(); cb.onUpgrades(); };
    row1.append(daily, upg);
    root.appendChild(row1);

    const row2 = el('div', 'btn-row');
    const coll = el('button', 'btn ghost small', i18n.t('menu_collection'));
    coll.onclick = () => { audio.unlock(); audio.click(); cb.onCollection(); };
    const achCount = d.achievements.filter((x) => !x.startsWith('cs_seen_')).length;
    const ach = el('button', 'btn ghost small', `${i18n.t('menu_achievements')} ${achCount}/13`);
    ach.onclick = () => { audio.unlock(); audio.click(); cb.onAchievements(); };
    const set = el('button', 'btn ghost small', i18n.t('menu_settings'));
    set.onclick = () => { audio.unlock(); audio.click(); cb.onSettings(); };
    const how = el('button', 'btn ghost small', '?');
    how.onclick = () => { audio.unlock(); audio.click(); cb.onHow(); };
    row2.append(coll, ach, set, how);
    root.appendChild(row2);

    this.root = root;
  }

  destroy(): void { this.root.remove(); }
}
