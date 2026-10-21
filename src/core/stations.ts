// Trạm làm việc khi chơi nhiều người: ai giữ trạm nào, gộp trạm khi ít người, ai được làm thao tác nào.
// Hàm thuần, có test. Chơi một mình thì một người giữ cả 4 trạm.
import type { Action, CupStation, RejectReason, ShopState, Station } from './types';

/** Thứ tự ly đi qua các trạm: Quầy trà → Kệ topping → Thu ngân. */
export const CUP_CHAIN: CupStation[] = ['tea', 'topping', 'cashier'];
export const ALL_STATIONS: Station[] = ['cashier', 'tea', 'topping', 'stock'];

/**
 * Trạm chưa ai chọn thì giao cho người giữ "trạm bạn" đầu tiên có người (CLAUDE.md mục 11):
 * 2 người: Thu ngân + Kho / Quầy trà + Kệ topping; 3 người: Thu ngân + Kho / Quầy trà / Kệ topping.
 */
const PARTNERS: Record<Station, Station[]> = {
  cashier: ['stock', 'tea', 'topping'],
  stock: ['cashier', 'tea', 'topping'],
  tea: ['topping', 'cashier', 'stock'],
  topping: ['tea', 'cashier', 'stock'],
};

export interface StationPlayer {
  uid: string;
  /** Trạm người đó tự chọn (null = chưa chọn / đã bị nhả). */
  station: Station | null;
  joinedAt: number;
}

export type StationOwners = Record<Station, string | null>;

/** Ai giữ từng trạm, sau khi gộp các trạm còn trống. Hai người chọn trùng thì người vào trước được giữ. */
export function stationOwners(players: StationPlayer[], hostUid: string | null = null): StationOwners {
  const owners: StationOwners = { cashier: null, tea: null, topping: null, stock: null };
  const sorted = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  for (const p of sorted) {
    if (p.station && owners[p.station] === null) owners[p.station] = p.uid;
  }
  const claimed = { ...owners };
  for (const s of ALL_STATIONS) {
    if (owners[s]) continue;
    const partner = PARTNERS[s].find((x) => claimed[x]);
    owners[s] = partner ? claimed[partner] : (hostUid ?? sorted[0]?.uid ?? null);
  }
  return owners;
}

export function stationsOf(owners: StationOwners, uid: string): Station[] {
  return ALL_STATIONS.filter((s) => owners[s] === uid);
}

/** Một người giữ cả 4 trạm (chơi một mình). */
export function soloOwners(uid: string): StationOwners {
  return { cashier: uid, tea: uid, topping: uid, stock: uid };
}

/** Thao tác thuộc trạm nào. null = việc của chủ phòng (thời gian trôi, khách đến, đóng cửa...). */
export function actionStation(action: Action): Station | null {
  switch (action.type) {
    case 'PICK_CUP':
    case 'POUR_TEA':
      return 'tea';
    case 'TAP_SYRUP':
    case 'SCOOP_ICE':
    case 'ADD_TOPPING':
      return 'topping';
    case 'SEAL_CUP':
    case 'SERVE_CUP':
      return 'cashier';
    case 'RESTOCK':
    case 'UNLOCK_ITEM':
    case 'BUY_UPGRADE':
      return 'stock';
    case 'DISCARD_CUP':
    case 'PASS_CUP':
      // Theo trạm ly đang nằm — kiểm tra riêng trong canPerform
      return 'tea';
    default:
      return null;
  }
}

/** Các thao tác tiêu tiền két (nhập hàng, mở khóa món, mua nâng cấp / trang trí). */
export function isSpending(action: Action): boolean {
  return action.type === 'RESTOCK' || action.type === 'UNLOCK_ITEM' || action.type === 'BUY_UPGRADE';
}

/** Ai được chi két trong phòng: chủ tiệm, và người giữ trạm Kho nếu host cho phép. */
export interface SpendRule {
  ownerUid: string;
  /** Host đã bật "Cho trạm Kho chi tiền két". */
  allowStock: boolean;
}

/** Người `uid` có được chi tiền két không (chơi đơn: không có luật → luôn được). */
export function canSpend(owners: StationOwners, uid: string, rule: SpendRule | null): boolean {
  if (!rule) return true;
  return uid === rule.ownerUid || (rule.allowStock && owners.stock === uid);
}

/**
 * Người `uid` có được làm `action` không. Trả về null nếu được, hoặc lý do từ chối.
 * Thao tác trên một ly: phải giữ trạm ly đang nằm VÀ trạm của thao tác.
 * Thao tác tiêu két: theo `spend` (chủ tiệm luôn được, dù đang ở trạm nào).
 */
export function canPerform(
  state: ShopState,
  owners: StationOwners,
  uid: string,
  action: Action,
  isHost: boolean,
  spend: SpendRule | null = null,
): RejectReason | null {
  if (isSpending(action) && spend) return canSpend(owners, uid, spend) ? null : 'notOwner';
  const station = actionStation(action);
  if (station === null) return isHost ? null : 'notYourStation';
  const mine = (s: Station) => owners[s] === uid;
  if ('cupId' in action) {
    const cup = state.cups.find((c) => c.id === action.cupId);
    if (!cup) return null; // reducer sẽ báo "không có ly"
    if (!mine(cup.station)) return 'notYourStation';
    if (action.type === 'DISCARD_CUP' || action.type === 'PASS_CUP') return null;
  }
  return mine(station) ? null : 'notYourStation';
}

/**
 * Trạm kế tiếp để chuyền ly tới: trạm sau trong chuỗi mà người khác giữ
 * (bỏ qua các trạm mình cũng giữ). null = không cần chuyền (mình làm tiếp được hết).
 */
export function nextStationFor(owners: StationOwners, uid: string, from: CupStation): CupStation | null {
  const start = CUP_CHAIN.indexOf(from);
  for (let i = start + 1; i < CUP_CHAIN.length; i++) {
    const s = CUP_CHAIN[i];
    if (owners[s] !== uid) return s;
  }
  return null;
}
