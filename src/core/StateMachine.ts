export type GameStateId =
  | 'BOOT' | 'LOADING' | 'MENU' | 'PLAYING' | 'PAUSED' | 'RESULTS';

const ALLOWED: Record<GameStateId, GameStateId[]> = {
  BOOT: ['LOADING'],
  LOADING: ['MENU'],
  MENU: ['PLAYING'],
  PLAYING: ['PAUSED', 'RESULTS', 'MENU'],
  PAUSED: ['PLAYING', 'MENU'],
  RESULTS: ['MENU', 'PLAYING'],
};

export class StateMachine {
  private state: GameStateId = 'BOOT';
  private listeners = new Set<(s: GameStateId, prev: GameStateId) => void>();

  get current(): GameStateId { return this.state; }

  can(to: GameStateId): boolean {
    return ALLOWED[this.state].includes(to);
  }

  go(to: GameStateId): boolean {
    if (!this.can(to)) {
      console.warn(`[state] illegal transition ${this.state} → ${to}`);
      return false;
    }
    const prev = this.state;
    this.state = to;
    for (const l of Array.from(this.listeners)) l(to, prev);
    return true;
  }

  subscribe(fn: (s: GameStateId, prev: GameStateId) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}
