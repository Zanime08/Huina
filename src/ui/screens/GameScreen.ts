import { CONFIG, Phase } from '../../config';
import { el, fmt, fmtSigned, toast, modal, avatarSVG, drawSpark } from '../helpers';
import { i18n } from '../i18n';
import { audio } from '../../audio/audioManager';
import { saveManager } from '../../meta/saveManager';
import { analytics } from '../../meta/analytics';
import { memeById } from '../../sim/memeRegistry';
import {
  SeasonState, SimCtx, MemeState, tickSeason, buyMeme, sellMeme, boostMeme,
  netWorth, portfolioValue, endSeason,
} from '../../sim/seasonSim';
import type { IPlatform } from '../../platform/IPlatform';
import type { AdsService } from '../../platform/AdsService';

/** Minimal view of the game state machine (avoids a circular import of Game). */
export interface StateMachineLike {
  go(to: 'PAUSED' | 'PLAYING'): boolean;
}

export interface GameCallbacks {
  onFinish(s: SeasonState): void;
  onQuit(s: SeasonState): void;
}

interface CardRefs {
  root: HTMLElement;
  phase: HTMLElement;
  fill: HTMLElement;
  num: HTMLElement;
  trend: HTMLElement;
  price: HTMLElement;
  stake: HTMLElement;
  spark: HTMLCanvasElement;
  farm: HTMLButtonElement;
  sell: HTMLButtonElement;
  sellHalf: HTMLButtonElement;
  boost: HTMLButtonElement;
  prevPhase: Phase;
  prevPrice: number;
}

export class GameScreen {
  readonly root: HTMLElement;
  private raf = 0;
  private last = 0;
  private lastDay = 1;
  private lastNewsKey = '';
  private cards: CardRefs[] = [];
  private listEl: HTMLElement;
  private dayEl: HTMLElement; private dayFill: HTMLElement;
  private goalFill: HTMLElement; private goalLabel: HTMLElement;
  private cashEl: HTMLElement; private profitEl: HTMLElement; private energyEl: HTMLElement;
  private tickerEl: HTMLElement; private tickerText: HTMLElement;
  private insiderEl: HTMLElement;
  private bannerEl: HTMLElement;
  private paused = false;
  private destroyed = false;
  private tutStep = 0; // 0 off, 1 farm, 2 sell, 3 done-hints
  private bailoutOffered = false;
  private newsIdx = 0;

  constructor(
    private s: SeasonState,
    private ctx: SimCtx,
    private platform: IPlatform,
    private ads: AdsService,
    private insider: number,
    private sm: StateMachineLike,
    private cb: GameCallbacks,
  ) {
    void platform;
    const root = el('div', 'screen');
    root.style.gap = '8px';

    // HUD
    const hud = el('div', 'hud');
    const top = el('div', 'hud-top');
    this.dayEl = el('div', 'hud-day', '');
    const bar = el('div', 'hud-daybar'); this.dayFill = el('div'); bar.appendChild(this.dayFill);
    const pauseBtn = el('button', 'icon-btn', i18n.t('hud_pause'));
    pauseBtn.onclick = () => this.showPause();
    top.append(this.dayEl, bar, pauseBtn);
    const stats = el('div', 'hud-stats');
    const mk = (label: string) => {
      const st = el('div', 'stat');
      const v = el('div', 'v', '0'); const l = el('div', 'l', label);
      st.append(v, l); stats.appendChild(st);
      return v;
    };
    this.cashEl = mk(i18n.t('hud_cash'));
    this.profitEl = mk(i18n.t('hud_profit'));
    this.energyEl = mk('⚡');
    hud.append(top, stats);
    // goal progress
    const goalRow = el('div', 'goal-row');
    this.goalLabel = el('div', 'goal-label', '');
    const goalBar = el('div', 'goal-bar'); this.goalFill = el('div'); goalBar.appendChild(this.goalFill);
    goalRow.append(this.goalLabel, goalBar);
    hud.appendChild(goalRow);
    root.appendChild(hud);

    // Ticker
    this.tickerEl = el('div', 'ticker');
    const dot = el('div', 'dot');
    this.tickerText = el('div', 'ticker-text', '…');
    this.tickerEl.append(dot, this.tickerText);
    root.appendChild(this.tickerEl);
    this.insiderEl = el('div', 'muted center', '');
    this.insiderEl.style.fontSize = '12px';
    this.insiderEl.style.display = this.insider > 0 ? 'block' : 'none';
    root.appendChild(this.insiderEl);

    // Meme list
    this.listEl = el('div', 'meme-list');
    root.appendChild(this.listEl);
    this.rebuildCards();

    // day banner overlay
    this.bannerEl = el('div', 'day-banner', '');
    this.bannerEl.style.display = 'none';
    root.appendChild(this.bannerEl);

    // tutorial
    if (!saveManager.data.tutorialDone) {
      this.tutStep = 1;
      analytics.event('tutorial_start');
      setTimeout(() => { if (!this.destroyed) toast(i18n.t('tut_farm'), 'gold', 4000); }, 600);
      setTimeout(() => this.applyTutGlow(), 700);
    }

    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('keydown', this.onKey);
    this.root = root;
    this.last = performance.now();
    this.showDayBanner(1);
    this.loop(this.last);
    this.refreshNews(true);
  }

  private onVis = (): void => {
    if (document.hidden && !this.paused && !this.s.over) this.showPause();
  };

  private onKey = (e: KeyboardEvent): void => {
    if (this.destroyed || this.paused || this.s.over) return;
    if (e.code === 'Space') { e.preventDefault(); this.showPause(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= this.s.memes.length) {
      if (e.shiftKey) this.doSell(n - 1, 1);
      else this.doFarm(n - 1);
    }
  };

  private showDayBanner(day: number): void {
    this.bannerEl.textContent = i18n.t('day_banner', { n: day });
    this.bannerEl.style.display = 'flex';
    // restart CSS animation
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    setTimeout(() => { if (!this.destroyed) this.bannerEl.style.display = 'none'; }, 1400);
  }

  private rebuildCards(): void {
    this.listEl.innerHTML = '';
    this.cards = [];
    this.s.memes.forEach((m, i) => {
      const def = memeById.get(m.defId);
      if (!def) return;
      const name = i18n.lang === 'ru' ? def.name.ru : def.name.en;
      const tag = i18n.lang === 'ru' ? def.tagline.ru : def.tagline.en;
      const card = el('div', 'meme-card');
      const head = el('div', 'meme-head');
      const img = document.createElement('img');
      img.className = 'avatar'; img.src = avatarSVG(def); img.alt = name; img.draggable = false;
      const names = el('div', 'meme-names');
      names.append(el('div', 'meme-name', `${i + 1}. ${name}`), el('div', 'meme-tag', tag));
      const phase = el('div', 'phase fresh', '');
      head.append(img, names, phase);
      const hypeRow = el('div', 'hype-row');
      const trend = el('div', 'trend', '');
      const hbar = el('div', 'hype-bar'); const fill = el('div', 'hype-fill'); hbar.appendChild(fill);
      const num = el('div', 'hype-num', '0');
      hypeRow.append(trend, hbar, num);
      const econ = el('div', 'meme-econ');
      const priceV = el('div', 'v', '0'); const stakeV = el('div', 'v', '0');
      const e1 = el('div', 'econ'); e1.append(priceV, el('div', 'l', i18n.t('price')));
      const e2 = el('div', 'econ'); e2.append(stakeV, el('div', 'l', `${i18n.t('stake')} (${i18n.t('shares')})`));
      econ.append(e1, e2);
      const spark = document.createElement('canvas');
      spark.className = 'spark';
      const actions = el('div', 'meme-actions');
      const farm = el('button', 'act farm', i18n.t('farm', { n: CONFIG.farmBatch })) as HTMLButtonElement;
      farm.onclick = () => this.doFarm(i);
      const sell = el('button', 'act sell', i18n.t('sell')) as HTMLButtonElement;
      sell.onclick = () => this.doSell(i, 1);
      const sellHalf = el('button', 'act sell', i18n.t('sell_half')) as HTMLButtonElement;
      sellHalf.style.flex = '0.6';
      sellHalf.onclick = () => this.doSell(i, 0.5);
      const boost = el('button', 'act boost', i18n.t('boost')) as HTMLButtonElement;
      boost.onclick = () => this.doBoost(i);
      actions.append(farm, sellHalf, sell, boost);
      card.append(head, hypeRow, econ, spark, actions);
      this.listEl.appendChild(card);
      this.cards.push({ root: card, phase, fill, num, trend, price: priceV, stake: stakeV, spark, farm, sell, sellHalf, boost, prevPhase: m.phase, prevPrice: m.price });
    });
    this.applyTutGlow();
  }

  private doFarm(i: number): void {
    audio.unlock();
    const r = buyMeme(this.s, i, CONFIG.farmBatch);
    if (!r.ok) {
      audio.error();
      toast(r.reason === 'cash' ? i18n.t('toast_no_cash') : i18n.t('toast_dead'), 'bad');
      return;
    }
    audio.buy();
    if (this.tutStep === 1) {
      this.tutStep = 2;
      toast(i18n.t('tut_sell'), 'gold', 4000);
      this.applyTutGlow();
    }
  }

  private doSell(i: number, frac: 0.5 | 1): void {
    audio.unlock();
    const m = this.s.memes[i];
    const before = this.s.cash;
    const r = sellMeme(this.s, i, frac, this.ctx);
    if (!r.ok) {
      audio.error();
      toast(r.reason === 'stake' ? i18n.t('toast_no_stake') : i18n.t('toast_dead'), 'bad');
      return;
    }
    const gain = this.s.cash - before;
    audio.sell();
    toast(`+${fmt(gain)} 🪙`, m && m.hype >= 85 ? 'gold' : '');
    if (this.tutStep === 2) {
      this.tutStep = 3;
      saveManager.data.tutorialDone = true;
      saveManager.saveAll();
      analytics.event('tutorial_complete');
      toast(i18n.t('tut_boost'), 'gold', 3500);
      setTimeout(() => { if (!this.destroyed) toast(i18n.t('tut_goal', { n: fmt(this.s.opts.goal) })); }, 3600);
      this.applyTutGlow();
    }
  }

  private doBoost(i: number): void {
    audio.unlock();
    const r = boostMeme(this.s, i, this.ctx);
    if (!r.ok) {
      audio.error();
      toast(r.reason === 'energy' ? i18n.t('toast_no_energy') : i18n.t('toast_dead'), 'bad');
      return;
    }
    audio.boost();
  }

  private applyTutGlow(): void {
    this.cards.forEach((c) => {
      c.farm.classList.remove('hint-glow');
      c.sell.classList.remove('hint-glow');
    });
    if (this.destroyed || this.tutStep < 1 || this.tutStep > 2) return;
    const first = this.cards[0];
    if (!first) return;
    if (this.tutStep === 1) first.farm.classList.add('hint-glow');
    else first.sell.classList.add('hint-glow');
  }

  private showPause(): void {
    if (this.s.over || this.paused) return;
    this.paused = true;
    this.sm.go('PAUSED');
    audio.click();
    const body = el('div', 'center muted', `${i18n.t('hud_day')} ${this.s.day}/${this.s.opts.daysTotal} · ${fmt(netWorth(this.s))} 🪙`);
    modal(i18n.t('paused_title'), body, [
      { label: i18n.t('paused_resume'), cls: 'primary', onClick: () => this.resume() },
      { label: i18n.t('bailout_btn', { n: 60 }), onClick: () => void this.bailout() },
      { label: i18n.t('paused_quit'), onClick: () => this.quit() },
    ]);
  }

  private resume(): void {
    this.paused = false;
    this.sm.go('PLAYING');
    this.last = performance.now();
  }

  /** Rewarded ad WITHOUT unpausing the sim: the world must not run while the ad covers it. */
  private async bailout(): Promise<void> {
    audio.click();
    const ok = await this.ads.showRewarded();
    analytics.event('ad_rewarded', { place: 'bailout', ok });
    if (ok) {
      this.s.cash = Math.round((this.s.cash + 60) * 10) / 10;
      toast(i18n.t('toast_reward', { n: 60 }), 'gold');
      audio.sell();
    } else {
      toast(i18n.t('toast_ad_fail'), 'bad');
    }
    this.resume();
  }

  private quit(): void {
    this.s.gaveUp = true;
    endSeason(this.s);
    this.cb.onQuit(this.s);
  }

  private loop = (now: number): void => {
    if (this.destroyed) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !this.s.over) {
      tickSeason(this.s, dt, this.ctx);
      this.ads.trackPlay(dt);
      if (this.s.day !== this.lastDay) {
        this.lastDay = this.s.day;
        audio.dayTick();
        this.newsIdx = 0;
        this.rebuildCards();
        this.showDayBanner(this.s.day);
        this.refreshNews(true);
        this.checkCollection();
        this.maybeBailout();
      } else {
        this.refreshNews(false);
      }
      this.update();
      this.checkMilestones();
      if (this.s.over) {
        this.cb.onFinish(this.s);
        return;
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Phase-transition celebrations / warnings (toast + sound, throttled by transition itself). */
  private checkMilestones(): void {
    this.s.memes.forEach((m, i) => {
      const c = this.cards[i];
      if (!c || m.phase === c.prevPhase) return;
      const def = memeById.get(m.defId);
      const name = def ? (i18n.lang === 'ru' ? def.name.ru : def.name.en) : m.defId;
      const from = c.prevPhase;
      c.prevPhase = m.phase;
      if (m.phase === 'viral' && (from === 'fresh' || from === 'rising')) {
        toast(i18n.t('ms_viral', { t: name }));
        audio.newsGood();
      } else if (m.phase === 'peak') {
        toast(i18n.t('ms_peak', { t: name }), 'gold');
        audio.legend();
      } else if (m.phase === 'cringe' && m.stake > 0) {
        toast(i18n.t('ms_cringe', { t: name }), 'bad');
        audio.newsBad();
      } else if (m.phase === 'dead') {
        toast(i18n.t('ms_dead', { t: name }), m.stake > 0 ? 'bad' : '');
      }
    });
  }

  private refreshNews(force: boolean): void {
    const key = `${this.s.day}:${this.newsIdx}`;
    const news = this.s.news;
    if (news.length === 0) return;
    // rotate through news items every few seconds
    const rot = Math.floor(performance.now() / 4000) % news.length;
    if (!force && key === this.lastNewsKey && rot === this.newsIdx) {
      // still update insider line cheaply
    } else {
      this.newsIdx = rot;
      this.lastNewsKey = key;
      const n = news[this.newsIdx] ?? news[0];
      this.tickerText.textContent = i18n.lang === 'ru' ? n.textRu : n.textEn;
      this.tickerEl.className = `ticker ${n.kind === 'bad' ? 'bad' : n.kind === 'good' ? 'good' : ''} ${n.kind === 'legend' ? 'legend' : ''}`;
      if (force) {
        if (n.kind === 'legend') { audio.legend(); toast(i18n.lang === 'ru' ? n.textRu : n.textEn, 'gold', 3500); }
        else if (n.kind === 'bad') audio.newsBad();
        else if (n.kind === 'good') audio.newsGood();
      }
    }
    if (this.insider > 0 && this.s.tomorrow.length > 0) {
      const t = this.s.tomorrow[0];
      this.insiderEl.textContent = i18n.t('news_tomorrow', { t: i18n.lang === 'ru' ? t.textRu : t.textEn });
    } else {
      this.insiderEl.textContent = '';
    }
  }

  private checkCollection(): void {
    const d = saveManager.data;
    let added = false;
    for (const m of this.s.memes) {
      if (!d.collection.includes(m.defId)) {
        d.collection.push(m.defId);
        added = true;
        const def = memeById.get(m.defId);
        if (def) toast(i18n.t('toast_new_meme', { t: i18n.lang === 'ru' ? def.name.ru : def.name.en }), 'gold');
      }
    }
    if (added) saveManager.saveAll();
  }

  private maybeBailout(): void {
    if (this.bailoutOffered) return;
    if (this.s.cash < 5 && portfolioValue(this.s) < 5 && !this.s.over) {
      this.bailoutOffered = true;
      this.paused = true;
      this.sm.go('PAUSED');
      modal(i18n.t('toast_bailout', { n: 60 }), el('div', 'center', '🆘'), [
        { label: i18n.t('toast_yes'), cls: 'primary', onClick: () => void this.bailout() },
        { label: i18n.t('toast_no'), onClick: () => this.resume() },
      ]);
    }
  }

  private update(): void {
    const s = this.s;
    this.dayEl.textContent = `${i18n.t('hud_day')} ${s.day}/${s.opts.daysTotal}`;
    this.dayFill.style.width = `${Math.min(100, s.dayT * 100)}%`;
    this.cashEl.textContent = `🪙${fmt(s.cash)}`;
    const profit = netWorth(s) - s.startCash;
    this.profitEl.textContent = fmtSigned(profit);
    this.profitEl.className = `v ${profit >= 0 ? 'good' : 'bad'}`;
    this.energyEl.textContent = `⚡${s.energy}`;
    const pct = Math.max(0, Math.min(1, profit / s.opts.goal));
    this.goalFill.style.width = `${pct * 100}%`;
    this.goalLabel.textContent = `🎯 ${fmt(Math.max(0, Math.round(profit)))}/${fmt(s.opts.goal)}`;

    s.memes.forEach((m, i) => {
      const c = this.cards[i];
      if (!c) return;
      c.root.className = `meme-card ${m.dead ? 'dead' : m.phase}`;
      c.phase.className = `phase ${m.phase}`;
      c.phase.textContent = i18n.t(`phase_${m.phase}`);
      c.fill.style.width = `${m.hype}%`;
      c.num.textContent = `${Math.round(m.hype)}`;
      c.trend.textContent = m.dead ? '✖' : m.trend > 1.2 ? '▲' : m.trend < -1.2 ? '▼' : '•';
      c.trend.style.color = m.trend > 1.2 ? 'var(--good)' : m.trend < -1.2 ? 'var(--bad)' : 'var(--muted)';
      // price flash on change
      if (m.price !== c.prevPrice) {
        c.price.classList.remove('flash-up', 'flash-down');
        void c.price.offsetWidth;
        c.price.classList.add(m.price > c.prevPrice ? 'flash-up' : 'flash-down');
        c.prevPrice = m.price;
      }
      c.price.textContent = `🪙${fmt(m.price)}`;
      const stakeVal = m.stake * m.price;
      c.stake.textContent = `${m.stake} (≈${fmt(stakeVal)})`;
      c.stake.style.color = m.stake > 0 ? (stakeVal >= m.invested ? 'var(--good)' : 'var(--bad)') : 'var(--text)';
      const canFarm = !m.dead && s.cash >= m.price * CONFIG.farmBatch;
      const canSell = !m.dead && m.stake > 0;
      c.farm.disabled = !canFarm;
      c.sell.disabled = !canSell;
      c.sellHalf.disabled = !canSell;
      c.boost.disabled = m.dead || s.energy < 1;
      if (m.history.length >= 2 && (this.s.day !== (c.spark.dataset.day as unknown as number))) {
        drawSpark(c.spark, m.history);
        c.spark.dataset.day = String(this.s.day);
      }
    });
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}

export type { MemeState };
