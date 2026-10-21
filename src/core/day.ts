// Ngày trong game: buổi sáng chuẩn bị, đồng hồ, lịch khách, đóng cửa, tổng kết, sang ngày mới.
import { CREDIT, RENT_PER_DAY } from '../config/inventory';
import {
  ARRIVAL_JITTER,
  ARRIVAL_SPREAD,
  CLOSE_HOUR,
  DAY_LENGTH_MS,
  HISTORY_LIMIT,
  MAX_CUSTOMERS,
  OPEN_HOUR,
  RATING_BONUS,
  getDayConfig,
} from '../config/progression';
import { STOCK_SCORING } from '../config/scoring';
import { deliver, expireLots, pay } from './inventory';
import { addDayToFame, pickExcellent } from './leaderboard';
import { generateCustomer } from './orders';
import { upgradeEffects } from './upgrades';
import { createRng, hashSeed } from './rng';
import { emptyStaffDay } from './economy';
import type { Action, DayStats, DaySummary, ShopState } from './types';

const SALT_ARRIVAL = 2;

export function emptyDayStats(cashStart: number): DayStats {
  return {
    cashStart,
    customersServed: 0,
    cupsServed: 0,
    unhappy: 0,
    ratingSum: 0,
    ratingCount: 0,
    revenue: 0,
    ingredients: 0,
    waste: 0,
    wasteCups: 0,
    restock: 0,
    unlock: 0,
    rent: 0,
    upgrade: 0,
    expired: {},
    expiredCost: 0,
    demand: {},
    lost: {},
    lostCustomers: 0,
    lostRevenue: 0,
    rush: 0,
    rushExtra: 0,
    borrowed: 0,
    repaid: 0,
    staff: {},
  };
}

/** Số khách trong ngày: theo bảng độ khó, cộng thêm nếu sao trung bình cao và nhờ nâng cấp (bảng hiệu...). */
export function customersForDay(day: number, ratingSum: number, ratingCount: number, extra = 0): number {
  const base = getDayConfig(day).customers + extra;
  if (ratingCount === 0) return base;
  const avg = ratingSum / ratingCount;
  const bonus = RATING_BONUS.find(([minStars]) => avg >= minStars)?.[1] ?? 0;
  return base + bonus;
}

/** Khoảng chờ từ khách `index` tới khách kế tiếp (ms): rải đều trong ngày, lệch ngẫu nhiên một chút. */
export function arrivalGap(seed: number, day: number, index: number, customersToday: number): number {
  const average = (DAY_LENGTH_MS * ARRIVAL_SPREAD) / Math.max(1, customersToday);
  const jitter = createRng(hashSeed(seed, SALT_ARRIVAL, day, index)).next() * 2 - 1;
  return Math.round(average * (1 + jitter * ARRIVAL_JITTER));
}

/** Giờ trong game, ví dụ "08:00", "13:45". */
export function clockText(time: number): string {
  const progress = Math.min(1, Math.max(0, time / DAY_LENGTH_MS));
  const minutes = Math.floor((OPEN_HOUR + (CLOSE_HOUR - OPEN_HOUR) * progress) * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Việc chủ phòng (host) cần làm lúc này: cho khách vào đúng lịch, hoặc đóng cửa khi đã hết khách.
 * Chơi đơn và nhiều người đều dùng hàm này nên mọi máy giống nhau.
 */
export function planHostActions(state: ShopState): Action[] {
  // Buổi sáng chuẩn bị: chưa có khách, chờ người chơi bấm "Mở cửa"
  if (state.phase === 'closed' || state.phase === 'prep') return [];
  const noMoreArrivals = state.phase === 'closing' || state.nextCustomerIndex >= state.customersToday;
  if (noMoreArrivals) return state.customers.length === 0 ? [{ type: 'END_DAY' }] : [];
  if (state.time < state.nextArrivalAt || state.customers.length >= MAX_CUSTOMERS) return [];
  const customer = generateCustomer(
    state.seed,
    state.nextCustomerIndex,
    state.day,
    { teas: state.unlockedTeas, toppings: state.unlockedToppings },
    state.time,
  );
  // Nâng cấp (ghế chờ...) làm khách kiên nhẫn lâu hơn
  const factor = upgradeEffects(state.upgrades).patienceFactor;
  return [{ type: 'CUSTOMER_ARRIVE', customer: { ...customer, drainPerSecond: customer.drainPerSecond * factor } }];
}

/** Lãi = doanh thu − nguyên liệu đã dùng − hao phí (ly hỏng) − đồ hết hạn bỏ đi − tiền thuê. */
export function profitOf(stats: DayStats): number {
  return stats.revenue - stats.ingredients - stats.waste - stats.expiredCost - stats.rent;
}

/**
 * Điểm quản lý kho của ngày (0–100): bớt điểm khi khách bỏ đi vì hết hàng, khi phải bỏ đồ hết hạn
 * (tính theo tỉ lệ tiền bỏ đi trên tiền nguyên liệu), và mỗi lần nhập gấp.
 */
export function stockScoreOf(stats: DayStats): number {
  const used = stats.ingredients + stats.expiredCost;
  const wasteShare = used > 0 ? stats.expiredCost / used : 0;
  const raw =
    100 -
    STOCK_SCORING.perLostCustomer * stats.lostCustomers -
    STOCK_SCORING.wasteWeight * wasteShare -
    STOCK_SCORING.perRush * stats.rush;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Đóng cửa: nhận nốt hàng đang giao, bỏ đồ hết hạn, trừ tiền thuê (thiếu thì ghi nợ), tự trả nợ bằng
 * phần két dư, chấm điểm quản lý kho, chọn "Nhân viên xuất sắc", lập bảng tổng kết, ghi vào lịch sử
 * và bảng thành tích của tiệm. `names`: tên người chơi (uid → tên). `manager`: người giữ trạm Kho.
 */
export function closeDay(
  state: ShopState,
  names: Record<string, string> = {},
  manager: string | null = null,
): { state: ShopState; summary: DaySummary } {
  // Ly còn dở trên bảng gỗ lúc đóng cửa tính là hao phí
  const leftover = state.cups.reduce((sum, c) => sum + c.cost, 0);
  let next: ShopState = {
    ...state,
    today: {
      ...state.today,
      waste: state.today.waste + leftover,
      wasteCups: state.today.wasteCups + state.cups.length,
    },
  };
  next = expireLots(deliver(next, true).state);
  // Tiền thuê luôn trả được: két không đủ thì phần thiếu ghi nợ
  next = pay(next, RENT_PER_DAY, true) ?? next;
  next = { ...next, today: { ...next.today, rent: next.today.rent + RENT_PER_DAY } };
  // Trả nợ bằng phần két vượt mức giữ lại (để sáng mai vẫn có tiền nhập hàng)
  const repay = Math.min(next.debt, Math.max(0, next.cash - CREDIT.keepCash));
  if (repay > 0) {
    next = { ...next, cash: next.cash - repay, debt: next.debt - repay, today: { ...next.today, repaid: next.today.repaid + repay } };
  }

  const stockScore = stockScoreOf(next.today);
  const excellent = pickExcellent(next.today.staff);
  const staff = { ...next.today.staff };
  if (excellent) staff[excellent] = { ...staff[excellent], excellent: 1 };
  if (manager) staff[manager] = { ...(staff[manager] ?? emptyStaffDay()), manage: stockScore };
  // Chỉ giữ tên của người có làm trong ngày
  const dayNames: Record<string, string> = {};
  for (const uid of Object.keys(staff)) if (names[uid]) dayNames[uid] = names[uid].slice(0, 16);
  const today: DayStats = { ...next.today, staff };
  const summary: DaySummary = {
    ...today,
    day: state.day,
    profit: profitOf(today),
    cashEnd: next.cash,
    debtEnd: next.debt,
    stockScore,
    names: dayNames,
    excellent,
  };
  return {
    summary,
    state: {
      ...next,
      phase: 'closed',
      cups: [],
      customers: [],
      today,
      yesterday: { demand: today.demand, lost: today.lost, expired: today.expired },
      history: [...state.history, summary].slice(-HISTORY_LIMIT),
      fame: addDayToFame(state.fame, staff, dayNames, excellent),
    },
  };
}

/**
 * Sang ngày mới (hoặc chơi lại từ đầu ngày): giữ két, kho, món đã mở, đánh giá; đặt lại đồng hồ và lịch
 * khách. Bắt đầu bằng buổi sáng chuẩn bị (nhập hàng giá thường), bấm "Mở cửa" mới có khách.
 */
export function startDay(state: ShopState, day: number): ShopState {
  // Hàng nhập gấp đã trả tiền mà chưa kịp giao thì giao luôn
  const delivered = deliver(state, true).state;
  return {
    ...delivered,
    day,
    phase: 'prep',
    time: 0,
    customers: [],
    cups: [],
    today: emptyDayStats(state.cash),
    customersToday: customersForDay(day, state.ratingSum, state.ratingCount, upgradeEffects(state.upgrades).extraCustomers),
    nextCustomerIndex: 0,
    nextArrivalAt: getDayConfig(day).firstArrivalMs,
  };
}
