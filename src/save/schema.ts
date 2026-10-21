// Định dạng bản lưu, có số phiên bản (schemaVersion) và hàm nâng cấp bản lưu cũ (migrate).
// Phần này là hàm thuần, có test; việc ghi/đọc thật nằm trong SaveRepository.
import { startingStock } from '../config/inventory';
import { HISTORY_LIMIT } from '../config/progression';
import { TEAS } from '../config/teas';
import { TOPPINGS } from '../config/toppings';
import { startDay } from '../core/day';
import { createShopState } from '../core/reducer';
import type { DaySummary, ShopState } from '../core/types';

export const SCHEMA_VERSION = 1;

export interface Settings {
  tutorialDone: boolean;
  /** Tắt toàn bộ âm thanh. */
  muted: boolean;
  /** Nhạc nền bật (tắt riêng được). */
  musicOn: boolean;
  /** Giảm chuyển động (bớt hình động). */
  reducedMotion: boolean;
}

/** Phần "tiệm" được lưu. Khách đang chờ và ly đang làm dở không lưu. */
export interface ShopSave {
  day: number;
  /** Đã đóng cửa ngày `day` (đang xem tổng kết) → mở lại thì vào ngày tiếp theo. */
  dayFinished: boolean;
  seed: number;
  cash: number;
  stock: Record<string, number>;
  unlockedTeas: string[];
  unlockedToppings: string[];
  ratingSum: number;
  ratingCount: number;
  history: DaySummary[];
}

export interface SaveData {
  schemaVersion: number;
  updatedAt: number;
  shop: ShopSave;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return { tutorialDone: false, muted: false, musicOn: true, reducedMotion: false };
}

export function createSave(state: ShopState, settings: Settings, now = Date.now()): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
    shop: {
      day: state.day,
      dayFinished: state.phase === 'closed',
      seed: state.seed,
      cash: state.cash,
      stock: { ...state.stock },
      unlockedTeas: [...state.unlockedTeas],
      unlockedToppings: [...state.unlockedToppings],
      ratingSum: state.ratingSum,
      ratingCount: state.ratingCount,
      history: state.history.slice(-HISTORY_LIMIT),
    },
    settings: { ...settings },
  };
}

/** Dựng lại tiệm từ bản lưu: bắt đầu lúc mở cửa (08:00) của ngày đang chơi. */
export function restoreShop(save: SaveData): ShopState {
  const s = save.shop;
  const base: ShopState = {
    ...createShopState(s.seed, s.day),
    cash: s.cash,
    stock: s.stock,
    unlockedTeas: s.unlockedTeas,
    unlockedToppings: s.unlockedToppings,
    ratingSum: s.ratingSum,
    ratingCount: s.ratingCount,
    history: s.history,
  };
  return startDay(base, s.dayFinished ? s.day + 1 : s.day);
}

/** Một bước nâng cấp: nhận bản lưu phiên bản N, trả về phiên bản N+1. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/**
 * Các bước nâng cấp theo phiên bản. Khi đổi cấu trúc bản lưu: tăng SCHEMA_VERSION
 * và thêm MIGRATIONS[phiên bản cũ] = (bản cũ) => bản mới.
 */
export const MIGRATIONS: Record<number, Migration> = {};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Đọc bản lưu bất kỳ (có thể cũ, thiếu trường, hoặc hỏng) → bản lưu đúng phiên bản hiện tại, hoặc null.
 * Bản lưu từ phiên bản game MỚI HƠN thì trả null (không đoán cấu trúc).
 */
export function migrate(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  currentVersion = SCHEMA_VERSION,
): SaveData | null {
  if (!isObject(raw) || typeof raw.schemaVersion !== 'number') return null;
  let data: Record<string, unknown> = raw;
  let version = raw.schemaVersion;
  if (version > currentVersion) return null;
  while (version < currentVersion) {
    const step = migrations[version];
    if (!step) return null;
    data = { ...step(data), schemaVersion: version + 1 };
    version += 1;
  }
  return normalize(data, currentVersion);
}

/** Điền giá trị mặc định cho trường thiếu, bỏ món không còn tồn tại, chặn số âm. */
function normalize(data: Record<string, unknown>, version: number): SaveData | null {
  const shop = data.shop;
  if (!isObject(shop)) return null;
  const teaIds = new Set(TEAS.map((t) => t.id));
  const toppingIds = new Set(TOPPINGS.map((t) => t.id));
  // Nguyên liệu mới thêm vào game sau khi lưu thì lấy số tồn mặc định
  const stock = startingStock();
  if (isObject(shop.stock)) {
    for (const id of Object.keys(stock)) stock[id] = Math.max(0, Math.floor(num(shop.stock[id], stock[id])));
  }
  const strings = (v: unknown, allowed: Set<string>): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && allowed.has(x)) : null;
  const defaults = createShopState(1);
  const settings = isObject(data.settings) ? data.settings : {};
  return {
    schemaVersion: version,
    updatedAt: num(data.updatedAt, 0),
    shop: {
      day: Math.max(1, Math.floor(num(shop.day, 1))),
      dayFinished: shop.dayFinished === true,
      seed: Math.floor(num(shop.seed, Math.floor(Math.random() * 2 ** 31))),
      cash: num(shop.cash, defaults.cash),
      stock,
      unlockedTeas: strings(shop.unlockedTeas, teaIds) ?? defaults.unlockedTeas,
      unlockedToppings: strings(shop.unlockedToppings, toppingIds) ?? defaults.unlockedToppings,
      ratingSum: Math.max(0, num(shop.ratingSum, 0)),
      ratingCount: Math.max(0, Math.floor(num(shop.ratingCount, 0))),
      history: Array.isArray(shop.history) ? (shop.history.filter(isObject) as unknown as DaySummary[]) : [],
    },
    settings: {
      ...defaultSettings(),
      ...(typeof settings.tutorialDone === 'boolean' ? { tutorialDone: settings.tutorialDone } : {}),
      ...(typeof settings.muted === 'boolean' ? { muted: settings.muted } : {}),
      ...(typeof settings.musicOn === 'boolean' ? { musicOn: settings.musicOn } : {}),
      ...(typeof settings.reducedMotion === 'boolean' ? { reducedMotion: settings.reducedMotion } : {}),
    },
  };
}

/** Chọn bản mới hơn theo updatedAt (bản nào null thì bỏ qua). */
export function newest(a: SaveData | null, b: SaveData | null): SaveData | null {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}
