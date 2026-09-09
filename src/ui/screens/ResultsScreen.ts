import { el, fmt, fmtSigned, toast } from '../helpers';
import { i18n } from '../i18n';
import { audio } from '../../audio/audioManager';
import { saveManager } from '../../meta/saveManager';
import { analytics } from '../../meta/analytics';
import { seasonResult, SeasonState } from '../../sim/seasonSim';
import { rewardForResult } from '../../sim/economy';
import type { IPlatform, LeaderboardEntry } from '../../platform/IPlatform';
import type { AdsService } from '../../platform/AdsService';

export interface ResultsCallbacks {
  onRetry(): void;
  onMenu(): void;
}

export class ResultsScreen {
  readonly root: HTMLElement;
  private x2used = false;

  constructor(
    private s: SeasonState,
    private platform: IPlatform,
    private ads: AdsService,
    private isDaily: boolean,
    private newBest: boolean,
    private cb: ResultsCallbacks,
  ) {
    const { profit, won, stars } = seasonResult(s);
    const baseReward = rewardForResult(won, stars);

    if (won) audio.win(); else audio.lose();

    const root = el('div', 'screen');
    root.appendChild(el('h2', 'center', won ? i18n.t('results_win') : i18n.t('results_lose')));
    if (won) {
      root.appendChild(el('div', 'stars', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
    } else {
      root.appendChild(el('p', 'center muted', i18n.t('results_lose_sub')));
    }
    const p = el('div', 'result-profit', fmtSigned(profit));
    p.style.color = profit >= 0 ? 'var(--good)' : 'var(--bad)';
    root.appendChild(p);
    if (this.newBest && won) root.appendChild(el('div', 'center', `🎉 <b>${i18n.t('results_best')}</b>`));

    const card = el('div', 'card');
    const row = (l: string, v: string) => card.appendChild(el('div', 'reward-row', `<span>${l}</span><b>${v}</b>`));
    row(i18n.t('results_goal'), fmtSigned(s.opts.goal));
    row(i18n.t('results_reward'), `🪙${fmt(baseReward)}`);
    root.appendChild(card);

    const x2 = el('button', 'btn', i18n.t('results_x2'));
    x2.onclick = async () => {
      if (this.x2used) return;
      audio.click();
      x2.disabled = true;
      const ok = await this.ads.showRewarded();
      analytics.event('ad_rewarded', { place: 'x2', ok });
      if (ok) {
        this.x2used = true;
        saveManager.addCoins(baseReward); // second half of x2 (first already granted)
        toast(i18n.t('toast_reward', { n: baseReward }), 'gold');
        audio.sell();
        x2.textContent = '✓ x2';
      } else {
        x2.disabled = false;
        toast(i18n.t('toast_ad_fail'), 'bad');
      }
    };
    root.appendChild(x2);

    const rowBtns = el('div', 'btn-row');
    const retry = el('button', 'btn primary', i18n.t('results_retry'));
    retry.onclick = () => { audio.click(); cb.onRetry(); };
    const menu = el('button', 'btn ghost', i18n.t('results_menu'));
    menu.onclick = () => { audio.click(); cb.onMenu(); };
    rowBtns.append(retry, menu);
    root.appendChild(rowBtns);

    const share = el('button', 'btn ghost small', i18n.t('results_share'));
    share.onclick = async () => {
      audio.click();
      analytics.event('share');
      const text = i18n.t('share_text', { p: fmt(profit), s: stars });
      const ok = await this.platform.share(text);
      toast(ok ? i18n.t('share_copied') : text, ok ? 'gold' : '');
    };
    root.appendChild(share);

    // leaderboard mini
    const lbCard = el('div', 'card');
    lbCard.appendChild(el('div', 'big', i18n.t('lb_title')));
    const lbList = el('div', '', `<span class="muted">${i18n.t('loading')}</span>`);
    lbCard.appendChild(lbList);
    root.appendChild(lbCard);
    void this.loadBoard(lbList);

    this.root = root;

    // interstitial on natural pause — delayed, only if enough active play
    setTimeout(() => {
      if (this.ads.canShowInterstitial()) {
        audio.stopMusic();
        void this.ads.showInterstitial().then((shown) => {
          analytics.event('ad_interstitial', { shown });
          audio.applySettings();
        });
      }
    }, 1200);
  }

  private async loadBoard(list: HTMLElement): Promise<void> {
    try {
      const board = this.isDaily ? 'hype_daily_profit' : 'hype_season_profit';
      const entries: LeaderboardEntry[] = await this.platform.getBoard(board);
      list.innerHTML = '';
      if (entries.length === 0) {
        list.appendChild(el('div', 'muted', i18n.t('lb_empty')));
        return;
      }
      entries.slice(0, 5).forEach((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${e.rank || i + 1}.`;
        const row = el('div', 'reward-row', `<span>${medal} ${e.isPlayer ? `<b>${i18n.t('lb_you')}</b>` : e.name}</span><b>${fmt(e.score)}</b>`);
        list.appendChild(row);
      });
    } catch {
      list.innerHTML = '';
    }
  }

  destroy(): void { this.root.remove(); }
}
