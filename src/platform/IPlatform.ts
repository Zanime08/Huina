// Platform abstraction: gameplay never touches `ysdk` directly.
export type Lang = 'ru' | 'en';

export interface LeaderboardEntry {
  name: string;
  score: number;
  rank: number;
  isPlayer: boolean;
}

export interface IPlatform {
  readonly isReal: boolean;
  init(): Promise<void>;
  getLang(): Lang;
  /** Server time in ms (fallback: Date.now()). */
  serverTime(): number;
  /** Fullscreen interstitial. Resolves false if unavailable/failed. */
  showInterstitial(): Promise<boolean>;
  /** Rewarded video. Resolves true ONLY if user earned the reward. */
  showRewarded(): Promise<boolean>;
  cloudLoad(): Promise<unknown>;
  cloudSave(data: unknown): Promise<void>;
  submitScore(board: string, score: number): Promise<void>;
  getBoard(board: string): Promise<LeaderboardEntry[]>;
  auth(): Promise<string | null>; // returns display name or null
  gameplayStart(): void;
  gameplayStop(): void;
  loadingReady(): void;
  share(text: string): Promise<boolean>;
}
