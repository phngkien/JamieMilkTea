// Định dạng bản lưu, có số phiên bản (schemaVersion) và hàm nâng cấp bản lưu cũ (migrate).
// Phần này là hàm thuần, có test; việc ghi/đọc thật nằm trong SaveRepository.
import { startingStock } from '../config/inventory';
import { OUTFITS } from '../config/outfits';
import { SHOP_NAME } from '../config/strings';
import { HISTORY_LIMIT } from '../config/progression';
import { TEAS } from '../config/teas';
import { TOPPINGS } from '../config/toppings';
import { UPGRADES } from '../config/upgrades';
import { startDay } from '../core/day';
import { createShopState } from '../core/reducer';
import { createProfile, type Ledger } from '../core/profile';
import type { CupStation, DaySummary, Profile, ShopState } from '../core/types';
import { decodeStaff } from '../net/serialize';

/**
 * Phiên bản 1: chỉ có tiệm + cài đặt (lưu trên máy).
 * Phiên bản 2: thêm hồ sơ cá nhân (profile), tên tiệm, chủ tiệm, nâng cấp, trang trí, thông tin đồng bộ cloud.
 */
export const SCHEMA_VERSION = 2;

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
  shopName: string;
  upgrades: string[];
  decor: string[];
  /** uid của chủ tiệm ('' = chưa đăng nhập lần nào). Tiệm lưu trên cloud ở /shops/{ownerUid}. */
  ownerUid: string;
  /** Lần cuối tiệm thay đổi (ms). */
  updatedAt: number;
  /**
   * `updatedAt` của bản trên cloud lúc đồng bộ gần nhất (0 = chưa từng).
   * Cloud vẫn giữ đúng số này → chưa ai sửa cloud → được đẩy tiến độ chơi offline lên.
   */
  cloudBase: number;
}

/** Thông tin tiệm không nằm trong ShopState (ai là chủ, đã đồng bộ tới đâu). */
export interface ShopMeta {
  ownerUid: string;
  cloudBase: number;
}

export interface SaveData {
  schemaVersion: number;
  updatedAt: number;
  shop: ShopSave;
  profile: Profile;
  /** Sổ ghi tip đã cộng (chỉ lưu trên máy). */
  ledger: Ledger;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return { tutorialDone: false, muted: false, musicOn: true, reducedMotion: false };
}

/** Phần tiệm để lưu, từ state đang chơi. */
export function shopSaveOf(state: ShopState, meta: ShopMeta, now: number): ShopSave {
  return {
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
    shopName: state.shopName,
    upgrades: [...state.upgrades],
    decor: [...state.decor],
    ownerUid: meta.ownerUid,
    updatedAt: now,
    cloudBase: meta.cloudBase,
  };
}

export interface SaveExtras {
  profile?: Profile;
  meta?: ShopMeta;
  ledger?: Ledger;
  now?: number;
}

export function createSave(state: ShopState, settings: Settings, extras: SaveExtras = {}): SaveData {
  const now = extras.now ?? Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
    shop: shopSaveOf(state, extras.meta ?? { ownerUid: '', cloudBase: 0 }, now),
    profile: { ...(extras.profile ?? createProfile()) },
    ledger: extras.ledger ?? {},
    settings: { ...settings },
  };
}

/** Dựng lại tiệm từ bản lưu: bắt đầu lúc mở cửa (08:00) của ngày đang chơi. `runId` là mã lượt chơi mới. */
export function restoreShop(save: { shop: ShopSave }, runId = ''): ShopState {
  const s = save.shop;
  const base: ShopState = {
    ...createShopState(s.seed, s.day, runId),
    cash: s.cash,
    stock: s.stock,
    unlockedTeas: s.unlockedTeas,
    unlockedToppings: s.unlockedToppings,
    ratingSum: s.ratingSum,
    ratingCount: s.ratingCount,
    history: s.history,
    shopName: s.shopName,
    upgrades: s.upgrades,
    decor: s.decor,
  };
  return startDay(base, s.dayFinished ? s.day + 1 : s.day);
}

/** Một bước nâng cấp: nhận bản lưu phiên bản N, trả về phiên bản N+1. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const text = (v: unknown, fallback: string, max: number) => (typeof v === 'string' ? v.slice(0, max) : fallback);

/**
 * Các bước nâng cấp theo phiên bản. Khi đổi cấu trúc bản lưu: tăng SCHEMA_VERSION
 * và thêm MIGRATIONS[phiên bản cũ] = (bản cũ) => bản mới.
 */
export const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: tên người chơi chuyển từ cài đặt sang profile; các trường mới điền mặc định khi normalize
  1: (old) => {
    const settings = isObject(old.settings) ? old.settings : {};
    return { ...old, profile: { name: typeof settings.playerName === 'string' ? settings.playerName : '' } };
  },
};

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
  const shop = normalizeShop(data.shop, num(data.updatedAt, 0));
  if (!shop) return null;
  const settings = isObject(data.settings) ? data.settings : {};
  return {
    schemaVersion: version,
    updatedAt: num(data.updatedAt, 0),
    shop,
    profile: normalizeProfile(data.profile),
    ledger: isObject(data.ledger) ? decodeStaff(data.ledger) : {},
    settings: {
      ...defaultSettings(),
      ...(typeof settings.tutorialDone === 'boolean' ? { tutorialDone: settings.tutorialDone } : {}),
      ...(typeof settings.muted === 'boolean' ? { muted: settings.muted } : {}),
      ...(typeof settings.musicOn === 'boolean' ? { musicOn: settings.musicOn } : {}),
      ...(typeof settings.reducedMotion === 'boolean' ? { reducedMotion: settings.reducedMotion } : {}),
    },
  };
}

/**
 * Tiệm (trên máy hoặc trên cloud) → ShopSave đúng chuẩn, hoặc null nếu hỏng.
 * Điền mặc định cho trường thiếu, bỏ món không còn tồn tại, chặn số âm.
 * Lịch sử có thể là mảng (trên máy) hoặc object {ngày: tổng kết} (trên cloud).
 */
export function normalizeShop(shop: unknown, fallbackUpdatedAt = 0): ShopSave | null {
  if (!isObject(shop)) return null;
  const teaIds = new Set(TEAS.map((t) => t.id));
  const toppingIds = new Set(TOPPINGS.map((t) => t.id));
  const upgradeIds = new Set(UPGRADES.filter((u) => u.kind === 'upgrade').map((u) => u.id));
  const decorIds = new Set(UPGRADES.filter((u) => u.kind === 'decor').map((u) => u.id));
  // Nguyên liệu mới thêm vào game sau khi lưu thì lấy số tồn mặc định
  const stock = startingStock();
  if (isObject(shop.stock)) {
    for (const id of Object.keys(stock)) stock[id] = Math.max(0, Math.floor(num(shop.stock[id], stock[id])));
  }
  const strings = (v: unknown, allowed: Set<string>): string[] | null => {
    const list = Array.isArray(v) ? v : isObject(v) ? Object.values(v) : null;
    return list ? [...new Set(list.filter((x): x is string => typeof x === 'string' && allowed.has(x)))] : null;
  };
  const rawHistory = Array.isArray(shop.history) ? shop.history : isObject(shop.history) ? Object.values(shop.history) : [];
  const history = (rawHistory.filter(isObject) as unknown as DaySummary[])
    .map((h) => ({ ...h, staff: decodeStaff(h.staff), upgrade: num(h.upgrade, 0) }))
    .sort((a, b) => a.day - b.day)
    .slice(-HISTORY_LIMIT);
  const defaults = createShopState(1);
  return {
    day: Math.max(1, Math.floor(num(shop.day, 1))),
    dayFinished: shop.dayFinished === true,
    seed: Math.floor(num(shop.seed, Math.floor(Math.random() * 2 ** 31))),
    cash: num(shop.cash, defaults.cash),
    stock,
    unlockedTeas: strings(shop.unlockedTeas, teaIds) ?? defaults.unlockedTeas,
    unlockedToppings: strings(shop.unlockedToppings, toppingIds) ?? defaults.unlockedToppings,
    ratingSum: Math.max(0, num(shop.ratingSum, 0)),
    ratingCount: Math.max(0, Math.floor(num(shop.ratingCount, 0))),
    history,
    shopName: text(shop.shopName, SHOP_NAME, 24).trim() || SHOP_NAME,
    upgrades: strings(shop.upgrades, upgradeIds) ?? [],
    decor: strings(shop.decor, decorIds) ?? [],
    ownerUid: text(shop.ownerUid, '', 128),
    updatedAt: num(shop.updatedAt, fallbackUpdatedAt),
    cloudBase: num(shop.cloudBase, 0),
  };
}

/** Profile (trên máy hoặc trên cloud) → Profile đúng chuẩn. Thiếu thì điền mặc định. */
export function normalizeProfile(raw: unknown): Profile {
  const base = createProfile();
  if (!isObject(raw)) return base;
  const outfitIds = new Set(OUTFITS.map((o) => o.id));
  const ownedRaw = Array.isArray(raw.ownedOutfits) ? raw.ownedOutfits : isObject(raw.ownedOutfits) ? Object.values(raw.ownedOutfits) : [];
  const owned = [...new Set([...base.ownedOutfits, ...ownedRaw.filter((x): x is string => typeof x === 'string' && outfitIds.has(x))])];
  const outfit = typeof raw.outfit === 'string' && owned.includes(raw.outfit) ? raw.outfit : base.outfit;
  const statsRaw = isObject(raw.stats) ? raw.stats : {};
  const stats = { ...base.stats };
  for (const s of Object.keys(stats) as CupStation[]) {
    const v = isObject(statsRaw[s]) ? statsRaw[s] : {};
    stats[s] = { cups: Math.max(0, Math.floor(num(v.cups, 0))), scoreSum: Math.max(0, num(v.scoreSum, 0)) };
  }
  return {
    uid: text(raw.uid, '', 128),
    name: text(raw.name, '', 16),
    outfit,
    ownedOutfits: owned,
    tipCoins: Math.max(0, Math.floor(num(raw.tipCoins, 0))),
    stats,
    excellent: Math.max(0, Math.floor(num(raw.excellent, 0))),
    updatedAt: num(raw.updatedAt, 0),
  };
}

/** Chọn bản mới hơn theo updatedAt (bản nào null thì bỏ qua). */
export function newest(a: SaveData | null, b: SaveData | null): SaveData | null {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}
