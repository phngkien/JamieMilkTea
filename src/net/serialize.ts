// Nén / giải nén state khi gửi qua Firebase Realtime Database.
// Firebase bỏ mất giá trị null và mảng rỗng, nên phải đổi trước khi ghi và điền lại khi đọc.
import { startingStock } from '../config/inventory';
import { emptyDayStats } from '../core/day';
import type { CupState, Customer, ShopState } from '../core/types';

/** Đánh dấu "chưa giao" trong order.served (thay cho null). */
const NOT_SERVED = -1;

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null;
const arr = <T>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[];
  // Firebase có thể trả mảng dưới dạng object {0: .., 1: ..}
  if (isObj(v)) return Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k] as T);
  return [];
};
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string | null = null) => (typeof v === 'string' ? v : d);

/** State gửi lên phòng (bỏ lịch sử các ngày cho nhẹ). */
export function encodeState(state: ShopState): Json {
  const { history: _history, ...rest } = state;
  void _history;
  return JSON.parse(
    JSON.stringify({
      ...rest,
      customers: state.customers.map((c) => ({
        ...c,
        order: { ...c.order, served: c.order.served.map((s) => (s === null ? NOT_SERVED : s)) },
      })),
    }),
  ) as Json;
}

function decodeCup(v: unknown): CupState {
  const c = isObj(v) ? v : {};
  return {
    id: str(c.id, '') ?? '',
    size: c.size === 'L' ? 'L' : 'M',
    tea: str(c.tea),
    fill: num(c.fill),
    sugarTaps: num(c.sugarTaps),
    iceScoops: num(c.iceScoops),
    toppings: arr<{ id: string; scoops: number }>(c.toppings),
    sealed: c.sealed === true,
    ruined: c.ruined === true,
    cost: num(c.cost),
    station: c.station === 'topping' || c.station === 'cashier' ? c.station : 'tea',
    forCustomer: str(c.forCustomer),
  };
}

function decodeCustomer(v: unknown): Customer {
  const c = isObj(v) ? v : {};
  const order = isObj(c.order) ? c.order : {};
  const cups = arr<Customer['order']['cups'][number]>(order.cups).map((spec) => ({
    ...spec,
    toppings: arr<{ id: string; scoops: number }>(spec.toppings),
  }));
  const served = arr<number>(order.served);
  return {
    id: str(c.id, '') ?? '',
    name: str(c.name, '') ?? '',
    look: num(c.look),
    lineVariant: num(c.lineVariant),
    order: {
      id: str(order.id, '') ?? '',
      cups,
      served: cups.map((_, i) => {
        const s = served[i];
        return typeof s === 'number' && s !== NOT_SERVED ? s : null;
      }),
    },
    patience: num(c.patience, 1),
    drainPerSecond: num(c.drainPerSecond, 1 / 90),
    arrivedAt: num(c.arrivedAt),
  };
}

/** Đọc state từ phòng. `history` lấy từ máy (không gửi qua mạng). */
export function decodeState(raw: unknown, history: ShopState['history'] = []): ShopState | null {
  if (!isObj(raw) || typeof raw.day !== 'number') return null;
  const stock = { ...startingStock(), ...(isObj(raw.stock) ? (raw.stock as Record<string, number>) : {}) };
  const today = { ...emptyDayStats(num(raw.cash)), ...(isObj(raw.today) ? raw.today : {}) } as ShopState['today'];
  return {
    solo: raw.solo === true,
    day: num(raw.day, 1),
    seed: num(raw.seed),
    phase: raw.phase === 'closing' || raw.phase === 'closed' ? raw.phase : 'open',
    time: num(raw.time),
    cash: num(raw.cash),
    stock,
    ratingSum: num(raw.ratingSum),
    ratingCount: num(raw.ratingCount),
    today,
    customersToday: num(raw.customersToday, 10),
    history,
    customers: arr(raw.customers).map(decodeCustomer),
    cups: arr(raw.cups).map(decodeCup),
    nextCustomerIndex: num(raw.nextCustomerIndex),
    nextArrivalAt: num(raw.nextArrivalAt),
    nextCupNumber: num(raw.nextCupNumber, 1),
    unlockedTeas: arr<string>(raw.unlockedTeas),
    unlockedToppings: arr<string>(raw.unlockedToppings),
  };
}

/** Bỏ các giá trị undefined (Firebase không nhận undefined). */
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
