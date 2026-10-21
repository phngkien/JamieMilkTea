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
  /** Giá vốn nguyên liệu đã dùng cho ly này (đồng). */
  cost: number;
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

/** Số liệu trong ngày, dùng cho bảng "Hết ngày N". Tiền tính bằng đồng. */
export interface DayStats {
  cashStart: number;
  /** Số khách đã phục vụ xong (giao đủ ly). */
  customersServed: number;
  cupsServed: number;
  /** Khách không vui: dưới 50 điểm hoặc bỏ đi. */
  unhappy: number;
  ratingSum: number;
  ratingCount: number;
  revenue: number;
  /** Giá vốn nguyên liệu của các ly đã bán. */
  ingredients: number;
  /** Nguyên liệu của ly bị bỏ (đổ, tràn). */
  waste: number;
  wasteCups: number;
  restock: number;
  unlock: number;
  rent: number;
}

export interface DaySummary extends DayStats {
  day: number;
  /** Lãi = doanh thu − nguyên liệu đã dùng − hao phí − tiền thuê. */
  profit: number;
  cashEnd: number;
}

/** open: đang mở cửa · closing: hết giờ, phục vụ nốt khách · closed: đã đóng, đang xem tổng kết. */
export type DayPhase = 'open' | 'closing' | 'closed';

export interface ShopState {
  day: number;
  seed: number;
  phase: DayPhase;
  /** Thời gian đã trôi trong ngày (ms). */
  time: number;
  /** Tiền trong két (đồng). */
  cash: number;
  /** Số tồn của từng nguyên liệu (xem config/inventory). */
  stock: Record<string, number>;
  /** Đánh giá tích lũy từ trước tới nay. */
  ratingSum: number;
  ratingCount: number;
  today: DayStats;
  /** Số khách sẽ đến trong ngày hôm nay. */
  customersToday: number;
  history: DaySummary[];
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
  | { type: 'TICK'; dt: number }
  | { type: 'RESTOCK'; item: string }
  | { type: 'UNLOCK_ITEM'; kind: 'tea' | 'topping'; id: string }
  | { type: 'END_DAY' }
  | { type: 'START_DAY' };

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
  | 'outOfStock'
  | 'noMoney'
  | 'tooEarly'
  | 'alreadyUnlocked'
  | 'dayClosed'
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
    }
  | { type: 'restocked'; item: string; amount: number; price: number }
  | { type: 'unlocked'; kind: 'tea' | 'topping'; id: string }
  | { type: 'dayEnded'; summary: DaySummary }
  | { type: 'dayStarted'; day: number };

export interface ReduceResult {
  state: ShopState;
  events: GameEvent[];
}
