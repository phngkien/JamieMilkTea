// Mọi kiểu dữ liệu dùng chung của game. File này không import Phaser hay Firebase.

export type Size = 'M' | 'L';
export type SugarLevel = 0 | 30 | 50 | 70 | 100;
export type IceLevel = 'none' | 'less' | 'normal';
export type Station = 'cashier' | 'tea' | 'topping' | 'stock';

export interface ToppingPortion {
  id: string;
  scoops: number;
}

/** Yêu cầu của khách cho một ly. */
export interface CupSpec {
  size: Size;
  tea: string;
  sugar: SugarLevel;
  ice: IceLevel;
  toppings: ToppingPortion[];
  foam?: string;
}

export interface Order {
  id: string;
  cups: CupSpec[];
  /** Điểm của từng ly đã giao (null = chưa giao). Cùng thứ tự với cups. */
  served: (number | null)[];
}

/** Ly đang pha trên bảng gỗ. */
export interface CupState {
  id: string;
  size: Size;
  tea: string | null;
  /** Mực trà: 0 = rỗng, 1 = tới miệng ly. */
  fill: number;
  sugarTaps: number;
  iceScoops: number;
  toppings: ToppingPortion[];
  sealed: boolean;
  /** Bị tràn: không giao được, chỉ bỏ vào thùng rác. */
  ruined: boolean;
}

export interface Customer {
  id: string;
  name: string;
  /** Chỉ số kiểu dáng (màu áo, tóc) trong config/customers. */
  look: number;
  /** Chỉ số mẫu câu gọi món. */
  lineVariant: number;
  order: Order;
  /** Kiên nhẫn còn lại: 1 = đầy, 0 = bỏ đi. */
  patience: number;
  /** Kiên nhẫn giảm bao nhiêu mỗi giây khi đứng ở quầy. */
  drainPerSecond: number;
  arrivedAt: number;
}

export interface ShopState {
  day: number;
  seed: number;
  /** Thời gian đã trôi trong ngày (ms). */
  time: number;
  /** Tổng tiền thu được (đồng). Két đầy đủ làm ở Prompt 2. */
  cash: number;
  ratingSum: number;
  ratingCount: number;
  servedCount: number;
  unhappyCount: number;
  /** customers[0] là khách đang ở quầy, phía sau là hàng chờ. */
  customers: Customer[];
  /** Các ly đang nằm trên bảng gỗ. */
  cups: CupState[];
  nextCustomerIndex: number;
  nextArrivalAt: number;
  nextCupNumber: number;
  unlockedTeas: string[];
  unlockedToppings: string[];
}

export type Action =
  | { type: 'PICK_CUP'; size: Size }
  | { type: 'POUR_TEA'; cupId: string; tea: string; amount: number }
  | { type: 'TAP_SYRUP'; cupId: string }
  | { type: 'SCOOP_ICE'; cupId: string }
  | { type: 'ADD_TOPPING'; cupId: string; topping: string }
  | { type: 'SEAL_CUP'; cupId: string }
  | { type: 'SERVE_CUP'; cupId: string; customerId: string }
  | { type: 'DISCARD_CUP'; cupId: string }
  | { type: 'CUSTOMER_ARRIVE'; customer: Customer }
  | { type: 'CUSTOMER_LEAVE'; customerId: string }
  | { type: 'TICK'; dt: number };

export type RejectReason =
  | 'boardFull'
  | 'noCup'
  | 'differentTea'
  | 'sugarMax'
  | 'iceMax'
  | 'toppingMax'
  | 'toppingTypesMax'
  | 'locked'
  | 'sealed'
  | 'ruined'
  | 'notSealed'
  | 'noCustomer'
  | 'emptyCup'
  | 'unknown';

export interface CupScore {
  total: number;
  stars: number;
  /** Sai size hoặc sai loại trà. */
  capped: boolean;
  parts: {
    size: number;
    tea: number;
    sugar: number;
    ice: number;
    topping: number;
    patience: number;
  };
}

/** Sự kiện reducer trả về để giao diện phát hiệu ứng / thông báo. */
export type GameEvent =
  | { type: 'cupPicked'; cupId: string }
  | { type: 'rejected'; action: Action['type']; reason: RejectReason }
  | { type: 'poured'; cupId: string }
  | { type: 'cupRuined'; cupId: string }
  | { type: 'syrupTapped'; cupId: string }
  | { type: 'iceScooped'; cupId: string }
  | { type: 'toppingAdded'; cupId: string; topping: string }
  | { type: 'cupSealed'; cupId: string }
  | { type: 'cupDiscarded'; cupId: string }
  | {
      type: 'served';
      cupId: string;
      customerId: string;
      score: CupScore;
      money: number;
      orderComplete: boolean;
    }
  | { type: 'customerArrived'; customerId: string }
  | {
      type: 'customerLeft';
      customerId: string;
      name: string;
      reason: 'done' | 'impatient';
      stars: number;
    };

export interface ReduceResult {
  state: ShopState;
  events: GameEvent[];
}
