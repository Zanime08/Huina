import { StateMachine } from './StateMachine';
import { bus, Events } from './EventBus';
import { mulberry32 } from './rng';
import { CONFIG } from '../config';
import { MEMES, EVENTS, ACHIEVEMENTS, poolForSeason } from '../sim/memeRegistry';
import { createSeason, seasonResult, SeasonState, SimCtx } from '../sim/seasonSim';
import { upgradeEffects, goalForSeason, seasonNumber, rewardForResult, contentSeason, contentSeasonName, registerStreak } from '../sim/economy';
import { saveManager } from '../meta/saveManager';
import { checkSeasonAchievements, unlock } from '../meta/achievements';
import { dailySeed, todayKey, weeklySeed, weekKey, monthForKey } from '../meta/daily';
import { analytics } from '../meta/analytics';
import type { IPlatform } from '../platform/IPlatform';
import { AdsService } from '../platform/AdsService';
import { i18n } from '../ui/i18n';
import { el, toast, modal, fmt } from '../ui/helpers';
import { MenuScreen } from '../ui/screens/MenuScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { ResultsScreen } from '../ui/screens/ResultsScreen';
import { UpgradesScreen, CollectionScreen, AchievementsScreen, SettingsScreen } from '../ui/screens/MetaScreens';
import { audio } from '../audio/audioManager';

type Mode = 'normal' | 'daily' | 'weekly';

interface Screen { readonly root: HTMLElement; destroy(): void; }

export class Game {
  readonly sm = new StateMachine();
  readonly ads: AdsService;
  private current: Screen | null = null;
  private mode: Mode = 'normal';
  private app: HTMLElement;

  constructor(private platform: IPlatform) {
    this.ads = new AdsService(platform, {
      before: () => audio.stopMusic(),
      after: () => audio.applySettings(),
    });
    this.app = document.getElementById('app') as HTMLElement;
    // Platform-initiated pause (ad, tab switch): silence music immediately.
    this.platform.onGamePause(() => audio.stopMusic());
    this.platform.onGameResume(() => audio.applySettings());
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
    // content-season unlock celebration
    const cs = contentSeason(saveManager.data);
    if (cs > 1 && !saveManager.data.achievements.includes(`cs_seen_${cs}`)) {
      saveManager.data.achievements.push(`cs_seen_${cs}`);
      saveManager.saveAll();
      setTimeout(() => toast(i18n.t('season2_unlocked', { t: contentSeasonName(saveManager.data, i18n.lang) }), 'gold', 4000), 400);
    }
    this.show(new MenuScreen(this.platform, {
      onPlay: () => this.startSeason('normal'),
      onDaily: () => this.startDaily(),
      onWeekly: () => this.startWeekly(),
      onUpgrades: () => this.show(new UpgradesScreen(() => this.showMenu())),
      onCollection: () => this.show(new CollectionScreen(() => this.showMenu())),
      onAchievements: () => this.show(new AchievementsScreen(() => this.showMenu())),
      onSettings: () => this.show(new SettingsScreen(() => this.showMenu(), () => { this.applyLang(); this.showMenu(); }, this.platform)),
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

  /** Weekly tournament: one shared seed for everyone, retries allowed, coins once a week. */
  private startWeekly(): void {
    this.startSeason('weekly');
  }

  private startSeason(mode: Mode): void {
    this.mode = mode;
    if (!this.sm.go('PLAYING')) return;
    const d = saveManager.data;
    const fx = upgradeEffects(d);
    const now = this.platform.serverTime();
    const seed = mode === 'daily' ? dailySeed(now)
      : mode === 'weekly' ? weeklySeed(now)
      : (Math.random() * 2 ** 31) | 0;
    const rng = mulberry32(seed);
    const goal = mode === 'daily' ? CONFIG.goalProfit
      : mode === 'weekly' ? CONFIG.weeklyGoal
      : goalForSeason(seasonNumber(d));
    // daily rotates content pools; weekly always showcases the newest season
    const cs = mode === 'daily' ? 1 + (dailySeed(now) % CONFIG.maxSeason)
      : mode === 'weekly' ? CONFIG.maxSeason
      : contentSeason(d);
    analytics.event('season_start', { mode, goal, contentSeason: cs });
    const state = createSeason(poolForSeason(cs), EVENTS, {
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
    // seasonal calendar: month from server time; for the weekly tournament it is
    // derived from the week key so every competitor gets the identical event pool
    const month = mode === 'weekly' ? monthForKey(weekKey(now)) : new Date(now).getUTCMonth() + 1;
    const ctx: SimCtx = { rng, defs: new Map(MEMES.map((m) => [m.id, m])), events: EVENTS, month };
    // day-1 collection unlock
    for (const m of state.memes) {
      if (!d.collection.includes(m.defId)) d.collection.push(m.defId);
    }
    saveManager.saveLocal();
    this.platform.gameplayStart();
    audio.unlock();
    audio.startMusic();
    this.show(new GameScreen(state, ctx, this.platform, this.ads, fx.insider, this.sm, {
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
    const isWeekly = this.mode === 'weekly';

    // rewards — quitting early never pays out (no daily/streak farming via quit)
    let reward = 0;
    if (isDaily) {
      if (!quit) {
        reward += rewardForResult(won, stars) + CONFIG.dailyBonus;
        const today = todayKey(this.platform.serverTime());
        d.dailyDate = today;
        const streakBonus = registerStreak(d, today);
        if (streakBonus > 0) {
          reward += streakBonus;
          setTimeout(() => toast(i18n.t('streak_bonus', { n: fmt(streakBonus) }), 'gold'), 800);
        }
        unlock('daily');
      }
    } else if (isWeekly) {
      if (!quit) {
        // coins only for the FIRST finished tournament run of the week;
        // retries keep competing for the leaderboard without re-minting coins
        const wk = weekKey(this.platform.serverTime());
        if (d.weeklyDate !== wk) {
          reward = rewardForResult(won, stars) + CONFIG.weeklyBonus;
          d.weeklyDate = wk;
        }
      }
    } else {
      reward = rewardForResult(won, stars);
    }
    // tournament retries run the same seed — they must not inflate progression
    if (!quit && !isWeekly) d.seasonsPlayed += 1;
    let newBest = false;
    if (!quit && profit > 0) {
      if (isDaily) {
        if (won && profit > d.dailyBest) { d.dailyBest = Math.round(profit); newBest = true; }
      } else if (isWeekly) {
        // tournament ranks everyone: any profit improvement counts, win not required
        if (profit > d.weeklyBest) { d.weeklyBest = Math.round(profit); newBest = true; }
      } else if (won) {
        if (profit > d.best) { d.best = Math.round(profit); newBest = true; }
        if (profit > d.bestWeek) d.bestWeek = Math.round(profit);
      }
    }
    d.stats.totalProfit += Math.max(0, Math.round(profit));
    d.stats.totalBoosts += s.stats.boosts;
    if (s.stats.burmaldaSeen) d.stats.burmaldaSeen = true;
    if (reward > 0) saveManager.addCoins(reward);
    saveManager.saveAll(true);
    analytics.event('season_end', { mode: this.mode, won, stars, profit: Math.round(profit), quit });

    // platform: leaderboard submit — only genuine improvements, only for finished runs
    if (newBest && profit > 0) {
      const board = isDaily ? 'hype_daily_profit' : isWeekly ? 'hype_weekly_profit' : 'hype_season_profit';
      void this.platform.submitScore(board, profit);
    }

    checkSeasonAchievements(s);

    this.show(new ResultsScreen(s, this.platform, this.ads, isDaily, isWeekly, newBest, {
      onRetry: () => {
        analytics.event('retry', { mode: this.mode });
        if (isDaily) this.showMenu(); // daily: one shot
        else {
          this.sm.go('MENU');
          this.startSeason(this.mode); // normal/weekly: retry the same mode (weekly keeps its shared seed)
        }
      },
      onMenu: () => this.showMenu(),
    }));
  }
}
