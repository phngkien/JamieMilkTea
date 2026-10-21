// Chơi đơn: áp dụng action ngay trên máy này.
import { planHostActions } from '../core/orders';
import { reduce } from '../core/reducer';
import type { Action, GameEvent, ShopState } from '../core/types';
import type { NetAdapter, StateListener } from './NetAdapter';

/** Không cho một khung hình quá dài (ví dụ tab bị ẩn rồi mở lại) làm khách bỏ đi hết. */
const MAX_TICK_MS = 250;

export class LocalAdapter implements NetAdapter {
  readonly isHost = true;
  private state: ShopState;
  private listeners = new Set<StateListener>();

  constructor(initial: ShopState) {
    this.state = initial;
  }

  getState(): ShopState {
    return this.state;
  }

  dispatch(action: Action): void {
    this.apply([action]);
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

  destroy(): void {
    this.listeners.clear();
  }

  private apply(actions: Action[]): void {
    const events: GameEvent[] = [];
    for (const action of actions) {
      const result = reduce(this.state, action);
      this.state = result.state;
      events.push(...result.events);
    }
    for (const listener of this.listeners) listener(this.state, events);
  }
}
