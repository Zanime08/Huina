import { StateMachine } from './StateMachine';
import { bus, Events } from './EventBus';
import { mulberry32 } from './rng';
import { CONFIG } from '../config';
import { MEMES, EVENTS, ACHIEVEMENTS, poolForSeason } from '../sim/memeRegistry';
import { createSeason, seasonResult, SeasonState, SimCtx } from '../sim/seasonSim';
import { upgradeEffects, goalForSeason, seasonNumber, rewardForResult } from '../sim/economy';
import { saveManager } from '../meta/saveManager';
import { checkSeasonAchievements, unlock } from '../meta/achievements';
import { dailySeed, todayKey } from '../meta/daily';
import type { IPlatform } from '../platform/IPlatform';
import { AdsService } from '../platform/AdsService';
import { i18n } from '../ui/i18n';
import { el, toast, modal } from '../ui/helpers';
import { MenuScreen } from '../ui/screens/MenuScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { ResultsScreen } from '../ui/screens/ResultsScreen';
import { UpgradesScreen, CollectionScreen, AchievementsScreen, SettingsScreen } from '../ui/screens/MetaScreens';
import { audio } from '../audio/audioManager';

type Mode = 'normal' | 'daily';

interface Screen { readonly root: HTMLElement; destroy(): void; }

export class Game {
  readonly sm = new StateMachine();
  readonly ads: AdsService;
  private current: Screen | null = null;
  private mode: Mode = 'normal';
  private app: HTMLElement;

  constructor(private platform: IPlatform) {
    this.ads = new AdsService(platform);
    this.app = document.getElementById('app') as HTMLElement;
    bus.on(Events.ACHIEVEMENT, (id) => {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        toast(i18n.t('toast_ach', { t: i18n.lang === 'ru' ? def.name.ru : def.name.en }), 'gold', 3500);
        audio.legend();
      }
    });
  }

  private show(screen: Screen): void {
    this.current?.destroy();
    this.current = screen;
    this.app.innerHTML = '';
    this.app.appendChild(screen.root);
  }

  applyLang(): void {
    const pref = saveManager.data.settings.lang;
    if (pref === 'auto') i18n.setLang(this.platform.getLang());
    else i18n.setLang(pref);
  }

  showMenu(): void {
    if (this.sm.current === 'BOOT') {
      this.sm.go('LOADING');
      this.sm.go('MENU');
    } else if (this.sm.current !== 'MENU') {
      this.sm.go('MENU');
    }
    this.platform.gameplayStop();
    audio.applySettings();
    this.show(new MenuScreen(this.platform, {
      onPlay: () => this.startSeason('normal'),
      onDaily: () => this.startDaily(),
      onUpgrades: () => this.show(new UpgradesScreen(() => this.showMenu())),
      onCollection: () => this.show(new CollectionScreen(() => this.showMenu())),
      onAchievements: () => this.show(new AchievementsScreen(() => this.showMenu())),
      onSettings: () => this.show(new SettingsScreen(() => this.showMenu(), () => { this.applyLang(); this.showMenu(); })),
      onHow: () => modal(i18n.t('how_title'), el('div', '', i18n.t('how_text')), [{ label: i18n.t('close'), cls: 'primary' }]),
    }));
  }

  private startDaily(): void {
    const today = todayKey(this.platform.serverTime());
    if (saveManager.data.dailyDate === today) {
      toast(i18n.t('daily_played'), 'bad');
      audio.error();
      return;
    }
    this.startSeason('daily');
  }

  private startSeason(mode: Mode): void {
    this.mode = mode;
    if (!this.sm.go('PLAYING')) return;
    const d = saveManager.data;
    const fx = upgradeEffects(d);
    const seed = mode === 'daily' ? dailySeed(this.platform.serverTime()) : (Math.random() * 2 ** 31) | 0;
    const rng = mulberry32(seed);
    const goal = mode === 'daily' ? CONFIG.goalProfit : goalForSeason(seasonNumber(d));
    const state = createSeason(poolForSeason(CONFIG.season), EVENTS, {
      slots: fx.slots,
      startCash: fx.startCash,
      maxEnergy: fx.maxEnergy,
      energyPerDay: fx.energyPerDay,
      luck: fx.luck,
      boostPower: fx.boostPower,
      goal,
      daysTotal: CONFIG.daysTotal,
      dayLength: CONFIG.dayLengthSec,
    }, rng);
    const ctx: SimCtx = { rng, defs: new Map(MEMES.map((m) => [m.id, m])), events: EVENTS };
    // day-1 collection unlock
    for (const m of state.memes) {
      if (!d.collection.includes(m.defId)) d.collection.push(m.defId);
    }
    saveManager.saveLocal();
    this.platform.gameplayStart();
    audio.unlock();
    audio.startMusic();
    this.show(new GameScreen(state, ctx, this.platform, this.ads, fx.insider, {
      onFinish: (s) => this.finishSeason(s, false),
      onQuit: (s) => this.finishSeason(s, true),
    }));
  }

  private finishSeason(s: SeasonState, quit: boolean): void {
    if (!this.sm.go('RESULTS')) return;
    this.platform.gameplayStop();
    const { profit, won, stars } = seasonResult(s);
    const d = saveManager.data;
    const isDaily = this.mode === 'daily';

    // rewards
    let reward = rewardForResult(won, stars);
    if (isDaily) {
      reward += CONFIG.dailyBonus;
      d.dailyDate = todayKey(this.platform.serverTime());
      unlock('daily');
    } else {
      d.seasonsPlayed += 1;
    }
    let newBest = false;
    if (!quit && won) {
      if (isDaily) {
        if (profit > d.dailyBest) { d.dailyBest = Math.round(profit); newBest = true; }
      } else {
        if (profit > d.best) { d.best = Math.round(profit); newBest = true; }
        const week = todayKey(this.platform.serverTime()).slice(0, 7);
        void week;
        if (profit > d.bestWeek) d.bestWeek = Math.round(profit);
      }
    }
    d.stats.totalProfit += Math.max(0, Math.round(profit));
    d.stats.totalBoosts += s.stats.boosts;
    if (s.stats.burmaldaSeen) d.stats.burmaldaSeen = true;
    saveManager.addCoins(reward);
    saveManager.saveAll(true);

    // platform: leaderboard submit (only meaningful scores)
    if (!quit && won && profit > 0) {
      const board = isDaily ? 'hype_daily_profit' : 'hype_season_profit';
      void this.platform.submitScore(board, profit);
    }

    const fresh = checkSeasonAchievements(s);
    void fresh;

    this.show(new ResultsScreen(s, this.platform, this.ads, isDaily, newBest, {
      onRetry: () => {
        if (isDaily) this.showMenu(); // daily: one shot
        else {
          // RESULTS → PLAYING is allowed; go back through MENU state internally
          this.sm.go('MENU');
          this.startSeason('normal');
        }
      },
      onMenu: () => this.showMenu(),
    }));
  }
}
