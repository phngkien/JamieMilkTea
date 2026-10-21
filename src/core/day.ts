// Ngày trong game: đồng hồ, lịch khách, đóng cửa, tổng kết, sang ngày mới.
import { RENT_PER_DAY } from '../config/inventory';
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
import { generateCustomer } from './orders';
import { createRng, hashSeed } from './rng';
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
  };
}

/** Số khách trong ngày: theo bảng độ khó, cộng thêm nếu sao trung bình cao. */
export function customersForDay(day: number, ratingSum: number, ratingCount: number): number {
  const base = getDayConfig(day).customers;
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
  if (state.phase === 'closed') return [];
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
  return [{ type: 'CUSTOMER_ARRIVE', customer }];
}

/** Lãi = doanh thu − nguyên liệu đã dùng − hao phí − tiền thuê. */
export function profitOf(stats: DayStats): number {
  return stats.revenue - stats.ingredients - stats.waste - stats.rent;
}

/** Đóng cửa: trừ tiền thuê, bỏ ly còn trên bảng, lập bảng tổng kết và ghi vào lịch sử. */
export function closeDay(state: ShopState): { state: ShopState; summary: DaySummary } {
  // Ly còn dở trên bảng gỗ lúc đóng cửa tính là hao phí
  const leftover = state.cups.reduce((sum, c) => sum + c.cost, 0);
  const today: DayStats = {
    ...state.today,
    waste: state.today.waste + leftover,
    wasteCups: state.today.wasteCups + state.cups.length,
    rent: state.today.rent + RENT_PER_DAY,
  };
  const cashEnd = state.cash - RENT_PER_DAY;
  const summary: DaySummary = { ...today, day: state.day, profit: profitOf(today), cashEnd };
  return {
    summary,
    state: {
      ...state,
      phase: 'closed',
      cash: cashEnd,
      cups: [],
      customers: [],
      today,
      history: [...state.history, summary].slice(-HISTORY_LIMIT),
    },
  };
}

/** Sang ngày mới: giữ két, kho, món đã mở, đánh giá; đặt lại đồng hồ và lịch khách. */
export function startDay(state: ShopState, day: number): ShopState {
  return {
    ...state,
    day,
    phase: 'open',
    time: 0,
    customers: [],
    cups: [],
    today: emptyDayStats(state.cash),
    customersToday: customersForDay(day, state.ratingSum, state.ratingCount),
    nextCustomerIndex: 0,
    nextArrivalAt: getDayConfig(day).firstArrivalMs,
  };
}
