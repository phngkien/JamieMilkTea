// Cầu nối giữa scene và logic game. Scene chỉ biết interface này:
// chơi đơn dùng LocalAdapter, nhiều người dùng FirebaseAdapter.
import type { StationOwners } from '../core/stations';
import type { Action, GameEvent, ShopState, Station } from '../core/types';

export type StateListener = (state: ShopState, events: GameEvent[]) => void;

export type EmoteKind = 'heart' | 'smile' | 'thumb' | 'hurry';

export interface PlayerInfo {
  uid: string;
  name: string;
  /** Trạm người đó chọn (null = chưa chọn). */
  station: Station | null;
  online: boolean;
  joinedAt: number;
  /** Màu tạp dề. */
  color: string;
}

/** Ai đó đang giữ bình rót (để người khác thấy trà dâng theo thời gian thực). */
export interface LivePour {
  uid: string;
  cupId: string;
  tea: string;
  amount: number;
}

export interface RoomInfo {
  code: string;
  status: 'lobby' | 'playing';
  hostUid: string;
  ownerUid: string;
  players: PlayerInfo[];
  /** Máy mình đang có kết nối tới Firebase. */
  connected: boolean;
}

export interface NetAdapter {
  readonly mode: 'solo' | 'room';
  /** Mã người chơi trên máy này. */
  readonly localId: string;
  /** Máy này có phải chủ phòng (trọng tài) không. Chơi đơn luôn là true. */
  readonly isHost: boolean;
  getState(): ShopState;
  /** Gửi một thao tác của người chơi. */
  dispatch(action: Action): void;
  /** Nghe khi state đổi. Trả về hàm để hủy nghe. */
  subscribe(listener: StateListener): () => void;
  /** Gọi mỗi khung hình: host cho thời gian trôi và cho khách vào. */
  update(dtMs: number): void;
  /** Ai giữ trạm nào (đã gộp trạm khi ít người). */
  getOwners(): StationOwners;
  getPlayers(): PlayerInfo[];
  /** Mình đang rót dở (null = thả tay). Gửi cho người khác xem. */
  setLivePour(pour: { cupId: string; tea: string; amount: number } | null): void;
  /** Những người khác đang rót dở. */
  getLivePours(): LivePour[];
  sendEmote(kind: EmoteKind): void;
  onEmote(listener: (uid: string, kind: EmoteKind) => void): () => void;
  destroy(): void;
}
