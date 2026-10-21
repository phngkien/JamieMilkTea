// Mọi kiểu dữ liệu dùng chung của game. File này không import Phaser hay Firebase.

export type Size = 'M' | 'L';
export type SugarLevel = 0 | 30 | 50 | 70 | 100;
export type IceLevel = 'none' | 'less' | 'normal';
export type Station = 'cashier' | 'tea' | 'topping' | 'stock';
/** Các trạm mà ly đi qua, theo thứ tự (CLAUDE.md mục 11). */
export type CupStation = 'tea' | 'topping' | 'cashier';

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
  /** Ly đang nằm ở trạm nào (chơi nhiều người: chỉ người giữ trạm đó được sửa ly). */
  station: CupStation;
  /** Khách đang ở quầy lúc lấy cốc — để tô viền ly cùng màu với khách. */
  forCustomer: string | null;
  /** Ai đã làm ly ở từng trạm (uid) — để chấm điểm cá nhân và chia tip. */
  makers: Partial<Record<CupStation, string>>;
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
  /** Tiền mua nâng cấp và trang trí trong ngày. */
  upgrade: number;
  /** Công sức từng người trong ngày (theo uid): tip, số ly, điểm trạm. */
  staff: Record<string, StaffDay>;
}

/** Số ly và tổng điểm của một người ở từng trạm (điểm trung bình = score / cups). */
export type StationTally = Record<CupStation, number>;

export interface StaffDay {
  /** Tiền tip cá nhân (đồng) — không vào két. */
  tips: number;
  cups: StationTally;
  score: StationTally;
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
  /** true = chơi một mình (một ly, không cần chuyền); false = phòng nhiều người. */
  solo: boolean;
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
  /** Tên tiệm (người chơi tự đặt). */
  shopName: string;
  /** Nâng cấp và đồ trang trí đã mua (id trong config/upgrades). */
  upgrades: string[];
  decor: string[];
  /**
   * Mã của "lượt chơi" hiện tại (đổi mỗi lần mở game / mở phòng). Dùng để cộng tip vào profile
   * đúng một lần, kể cả khi chơi lại cùng một ngày.
   */
  runId: string;
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
  | { type: 'PASS_CUP'; cupId: string; to: CupStation }
  | { type: 'CUSTOMER_ARRIVE'; customer: Customer }
  | { type: 'CUSTOMER_LEAVE'; customerId: string }
  | { type: 'TICK'; dt: number }
  | { type: 'RESTOCK'; item: string }
  | { type: 'UNLOCK_ITEM'; kind: 'tea' | 'topping'; id: string }
  | { type: 'BUY_UPGRADE'; id: string }
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
  | 'stationBusy'
  | 'notYourStation'
  | 'notOwner'
  | 'alreadyOwned'
  | 'unknown';

/** Điểm cá nhân 0–100 theo từng trạm của một ly (CLAUDE.md mục 12). */
export type StationScores = Record<CupStation, number>;

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
  | { type: 'cupPassed'; cupId: string; to: CupStation }
  | {
      type: 'served';
      cupId: string;
      customerId: string;
      score: CupScore;
      money: number;
      orderComplete: boolean;
      /** Tip của ly (đồng) và phần của từng người (uid → đồng). */
      tip: number;
      tips: Record<string, number>;
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
  | { type: 'upgraded'; id: string }
  | { type: 'dayEnded'; summary: DaySummary }
  | { type: 'dayStarted'; day: number };

export interface ReduceResult {
  state: ShopState;
  events: GameEvent[];
}
