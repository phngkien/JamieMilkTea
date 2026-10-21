// Nén / giải nén state khi gửi qua Firebase Realtime Database.
// Firebase bỏ mất giá trị null và mảng rỗng, nên phải đổi trước khi ghi và điền lại khi đọc.
import { startingStock } from '../config/inventory';
import { SHOP_NAME } from '../config/strings';
import { emptyDayStats } from '../core/day';
import { emptyStaffDay } from '../core/economy';
import { emptyFame } from '../core/leaderboard';
import type { CupState, CupStation, Customer, FameEntry, ShopState, StaffDay } from '../core/types';

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
    makers: decodeMakers(c.makers),
  };
}

const CUP_STATIONS: CupStation[] = ['tea', 'topping', 'cashier'];

function decodeMakers(v: unknown): CupState['makers'] {
  const m = isObj(v) ? v : {};
  const out: CupState['makers'] = {};
  for (const s of CUP_STATIONS) if (typeof m[s] === 'string') out[s] = m[s];
  return out;
}

/** Bảng công sức trong ngày (uid → tip, số ly, điểm). Thiếu trường thì điền 0. */
export function decodeStaff(v: unknown): Record<string, StaffDay> {
  const out: Record<string, StaffDay> = {};
  if (!isObj(v)) return out;
  for (const [uid, raw] of Object.entries(v)) {
    const d = isObj(raw) ? raw : {};
    const day = emptyStaffDay();
    day.tips = Math.max(0, num(d.tips));
    day.drinks = Math.max(0, num(d.drinks));
    day.streak = Math.max(0, num(d.streak));
    day.bestStreak = Math.max(0, num(d.bestStreak));
    day.excellent = num(d.excellent) > 0 ? 1 : 0;
    const cups = isObj(d.cups) ? d.cups : {};
    const score = isObj(d.score) ? d.score : {};
    for (const s of CUP_STATIONS) {
      day.cups[s] = Math.max(0, num(cups[s]));
      day.score[s] = Math.max(0, num(score[s]));
    }
    out[uid] = day;
  }
  return out;
}

/** Bảng thành tích của tiệm (uid → thành tích). Thiếu / hỏng thì điền 0. */
export function decodeFame(v: unknown): Record<string, FameEntry> {
  const out: Record<string, FameEntry> = {};
  if (!isObj(v)) return out;
  for (const [uid, raw] of Object.entries(v)) {
    const d = isObj(raw) ? raw : {};
    const e = emptyFame(typeof d.name === 'string' ? d.name.slice(0, 16) : '');
    e.days = Math.max(0, Math.floor(num(d.days)));
    e.excellent = Math.max(0, Math.floor(num(d.excellent)));
    e.bestStreak = Math.max(0, Math.floor(num(d.bestStreak)));
    const cups = isObj(d.cups) ? d.cups : {};
    const score = isObj(d.score) ? d.score : {};
    for (const s of CUP_STATIONS) {
      e.cups[s] = Math.max(0, num(cups[s]));
      e.score[s] = Math.max(0, num(score[s]));
    }
    out[uid] = e;
  }
  return out;
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
  const rawToday = isObj(raw.today) ? raw.today : {};
  const today = {
    ...emptyDayStats(num(raw.cash)),
    ...rawToday,
    staff: decodeStaff(rawToday.staff),
  } as ShopState['today'];
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
    shopName: str(raw.shopName, SHOP_NAME) ?? SHOP_NAME,
    upgrades: arr<string>(raw.upgrades),
    decor: arr<string>(raw.decor),
    fame: decodeFame(raw.fame),
    runId: str(raw.runId, '') ?? '',
  };
}

/** Bỏ các giá trị undefined (Firebase không nhận undefined). */
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
