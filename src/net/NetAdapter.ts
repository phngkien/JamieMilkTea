// Cầu nối giữa scene và logic game. Scene chỉ biết interface này:
// chơi đơn dùng LocalAdapter, nhiều người (Prompt 4) dùng FirebaseAdapter.
import type { Action, GameEvent, ShopState } from '../core/types';

export type StateListener = (state: ShopState, events: GameEvent[]) => void;

export interface NetAdapter {
  /** Máy này có phải chủ phòng (trọng tài) không. Chơi đơn luôn là true. */
  readonly isHost: boolean;
  getState(): ShopState;
  /** Gửi một thao tác của người chơi. */
  dispatch(action: Action): void;
  /** Nghe khi state đổi. Trả về hàm để hủy nghe. */
  subscribe(listener: StateListener): () => void;
  /** Gọi mỗi khung hình: host cho thời gian trôi và cho khách vào. */
  update(dtMs: number): void;
  destroy(): void;
}
