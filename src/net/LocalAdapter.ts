// Chơi đơn: áp dụng action ngay trên máy này. Một người giữ cả 4 trạm.
import { STAFF } from '../config/characters';
import { UI_TEXT } from '../config/strings';
import { planHostActions } from '../core/day';
import { reduce } from '../core/reducer';
import { soloOwners, type StationOwners } from '../core/stations';
import type { Action, GameEvent, ShopState } from '../core/types';
import type { EmoteKind, LivePour, NetAdapter, PlayerInfo, StateListener } from './NetAdapter';

/** Không cho một khung hình quá dài (ví dụ tab bị ẩn rồi mở lại) làm khách bỏ đi hết. */
export const MAX_TICK_MS = 250;
export const SOLO_ID = 'me';

export class LocalAdapter implements NetAdapter {
  readonly mode = 'solo';
  readonly localId = SOLO_ID;
  readonly isHost = true;
  private state: ShopState;
  private listeners = new Set<StateListener>();
  private emoteListeners = new Set<(uid: string, kind: EmoteKind) => void>();
  private owners = soloOwners(SOLO_ID);

  constructor(initial: ShopState) {
    this.state = { ...initial, solo: true };
  }

  getState(): ShopState {
    return this.state;
  }

  dispatch(action: Action): void {
    this.apply([action], SOLO_ID);
  }

  canSpend(): boolean {
    return true;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(dtMs: number): void {
    this.apply([{ type: 'TICK', dt: Math.min(dtMs, MAX_TICK_MS) }]);
    const hostActions = planHostActions(this.state);
    if (hostActions.length > 0) this.apply(hostActions);
  }

  getOwners(): StationOwners {
    return this.owners;
  }

  getPlayers(): PlayerInfo[] {
    return [{ uid: SOLO_ID, name: UI_TEXT.staffName, station: null, online: true, joinedAt: 0, color: STAFF.accent }];
  }

  setLivePour(): void {
    // Chơi một mình: không cần gửi cho ai
  }

  getLivePours(): LivePour[] {
    return [];
  }

  sendEmote(kind: EmoteKind): void {
    for (const l of this.emoteListeners) l(SOLO_ID, kind);
  }

  onEmote(listener: (uid: string, kind: EmoteKind) => void): () => void {
    this.emoteListeners.add(listener);
    return () => this.emoteListeners.delete(listener);
  }

  destroy(): void {
    this.listeners.clear();
    this.emoteListeners.clear();
  }

  private apply(actions: Action[], actor: string | null = null): void {
    const events: GameEvent[] = [];
    for (const action of actions) {
      const result = reduce(this.state, action, actor);
      this.state = result.state;
      events.push(...result.events);
    }
    for (const listener of this.listeners) listener(this.state, events);
  }
}
