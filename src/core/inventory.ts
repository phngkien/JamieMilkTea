// Kho: lô hàng có hạn dùng, tiêu hao, nhập hàng (sáng / nhập gấp), mua chịu, hết hạn, mở khóa món mới.
// Hàm thuần, không bao giờ để kho âm. `stock[id]` luôn bằng tổng số lượng các lô của `lots[id]`.
import { ICE_STEPS, SUGAR_STEPS } from '../config/cup';
import {
  CREDIT,
  RUSH,
  STOCK_ICE,
  STOCK_SUGAR,
  UNLOCKS,
  getStockDef,
  packOf,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
  unitCost,
  type PackSize,
} from '../config/inventory';
import { getUpgrade } from '../config/upgrades';
import type { CupSpec, Delivery, Lot, RejectReason, ShopState } from './types';
import { upgradeEffects } from './upgrades';

export type InventoryResult = { ok: true; state: ShopState } | { ok: false; reason: RejectReason };

type Stockroom = Pick<ShopState, 'stock' | 'lots'>;

export function stockOf(state: Pick<ShopState, 'stock'>, id: string): number {
  return state.stock[id] ?? 0;
}

/** Ngày cuối còn dùng được của hàng nhập vào ngày `day` (0 = không hỏng). */
export function untilFor(id: string, day: number): number {
  const life = getStockDef(id).shelfLife;
  return life > 0 ? day + life - 1 : 0;
}

/** Lô hết hạn sớm hơn đứng trước; lô không hỏng (until = 0) đứng cuối. */
const expiryKey = (until: number) => (until === 0 ? Number.MAX_SAFE_INTEGER : until);

/** Thêm một lô vào danh sách (gộp với lô cùng hạn và cùng giá), giữ thứ tự hạn dùng. */
export function addLot(lots: Lot[], lot: Lot): Lot[] {
  if (lot.qty <= 0) return lots;
  const same = lots.findIndex((l) => l.until === lot.until && l.cost === lot.cost);
  const next = same >= 0 ? lots.map((l, i) => (i === same ? { ...l, qty: l.qty + lot.qty } : l)) : [...lots, lot];
  return next.sort((a, b) => expiryKey(a.until) - expiryKey(b.until));
}

/** Cộng hàng vào kho (cả số tồn và lô). */
export function putStock(room: Stockroom, id: string, lot: Lot): Stockroom {
  return {
    stock: { ...room.stock, [id]: (room.stock[id] ?? 0) + lot.qty },
    lots: { ...room.lots, [id]: addLot(room.lots[id] ?? [], lot) },
  };
}

/** Kho mới: mỗi nguyên liệu một lô với giá vốn chuẩn, hạn tính từ ngày `day`. */
export function lotsFromStock(stock: Record<string, number>, day: number): Record<string, Lot[]> {
  const lots: Record<string, Lot[]> = {};
  for (const [id, qty] of Object.entries(stock)) {
    lots[id] = qty > 0 ? [{ qty, cost: unitCost(id), until: untilFor(id, day) }] : [];
  }
  return lots;
}

/**
 * Lấy `amount` đơn vị ra khỏi kho, dùng lô sắp hết hạn trước. Không đủ thì trả về null (kho giữ nguyên).
 * Trả kèm giá vốn thật của phần đã lấy để cộng vào ly.
 */
export function consume(room: Stockroom, id: string, amount = 1): (Stockroom & { cost: number }) | null {
  const have = room.stock[id] ?? 0;
  if (have < amount) return null;
  let left = amount;
  let cost = 0;
  const lots: Lot[] = [];
  for (const lot of room.lots[id] ?? []) {
    const take = Math.min(left, lot.qty);
    left -= take;
    cost += take * lot.cost;
    if (lot.qty > take) lots.push({ ...lot, qty: lot.qty - take });
  }
  // Lô bị lệch với số tồn (bản lưu cũ / hỏng): phần thiếu tính theo giá chuẩn
  if (left > 0) cost += left * unitCost(id);
  return { stock: { ...room.stock, [id]: have - amount }, lots: { ...room.lots, [id]: lots }, cost };
}

/** Đang trong giờ mở cửa → nhập hàng là nhập gấp. */
export function isRush(state: Pick<ShopState, 'phase'>): boolean {
  return state.phase !== 'prep';
}

/**
 * Giá nhập một gói, sau khi trừ giảm giá từ nâng cấp và nhân hệ số nhập gấp (làm tròn tới 100 đồng).
 * `rush` mặc định theo pha hiện tại.
 */
export function restockPrice(state: ShopState, item: string, pack: PackSize = 'big', rush = isRush(state)): number {
  const discount = upgradeEffects(state.upgrades).restockDiscount;
  const factor = rush ? RUSH.priceFactor : 1;
  return Math.round((packOf(item, pack).price * (1 - discount) * factor) / 100) * 100;
}

/** Hạn mức mua chịu còn lại. */
export function creditLeft(state: Pick<ShopState, 'debt'>): number {
  return Math.max(0, CREDIT.limit - state.debt);
}

/** Có trả được `price` không (bằng két, thiếu thì mua chịu trong hạn mức). */
export function canAfford(state: Pick<ShopState, 'cash' | 'debt'>, price: number): boolean {
  return state.cash + creditLeft(state) >= price;
}

/**
 * Trả tiền bằng két; thiếu thì ghi nợ phần còn lại. `force` = luôn trả được (tiền thuê), kể cả vượt hạn mức.
 * Két không bao giờ âm.
 */
export function pay(state: ShopState, price: number, force = false): ShopState | null {
  if (state.cash >= price) return { ...state, cash: state.cash - price };
  if (!force && !canAfford(state, price)) return null;
  const owed = price - Math.max(0, state.cash);
  return {
    ...state,
    cash: Math.min(0, state.cash),
    debt: state.debt + owed,
    today: { ...state.today, borrowed: state.today.borrowed + owed },
  };
}

/**
 * Nhập một gói nguyên liệu. Buổi sáng: giá thường, có hàng ngay.
 * Trong giờ mở cửa: nhập gấp, giá cao hơn, hàng tới sau RUSH.deliveryMs.
 */
export function restock(state: ShopState, item: string, pack: PackSize = 'big'): InventoryResult {
  if (state.phase === 'closed') return { ok: false, reason: 'dayClosed' };
  const { size } = packOf(item, pack);
  const rush = isRush(state);
  const price = restockPrice(state, item, pack, rush);
  const paid = pay(state, price);
  if (!paid) return { ok: false, reason: 'noMoney' };
  const lot: Lot = { qty: size, cost: price / size, until: untilFor(item, state.day) };
  const today = { ...paid.today, restock: paid.today.restock + price };
  if (!rush) return { ok: true, state: { ...paid, ...putStock(paid, item, lot), today } };
  const delivery: Delivery = { item, ...lot, at: state.time + RUSH.deliveryMs };
  return {
    ok: true,
    state: {
      ...paid,
      incoming: [...paid.incoming, delivery],
      today: {
        ...today,
        rush: today.rush + 1,
        rushExtra: today.rushExtra + (price - restockPrice(state, item, pack, false)),
      },
    },
  };
}

/** Hàng nhập gấp tới nơi (hoặc `all` = giao hết, dùng lúc đóng cửa). */
export function deliver(state: ShopState, all = false): { state: ShopState; arrived: Delivery[] } {
  const arrived = state.incoming.filter((d) => all || d.at <= state.time);
  if (arrived.length === 0) return { state, arrived };
  let room: Stockroom = state;
  for (const d of arrived) room = putStock(room, d.item, { qty: d.qty, cost: d.cost, until: d.until });
  return { state: { ...state, ...room, incoming: state.incoming.filter((d) => !arrived.includes(d)) }, arrived };
}

/** Đóng cửa ngày `state.day`: bỏ các lô hết hạn hôm nay, ghi số lượng và giá vốn bị bỏ. */
export function expireLots(state: ShopState): ShopState {
  const stock = { ...state.stock };
  const lots: Record<string, Lot[]> = {};
  const expired: Record<string, number> = { ...state.today.expired };
  let expiredCost = state.today.expiredCost;
  for (const [id, list] of Object.entries(state.lots)) {
    const keep: Lot[] = [];
    for (const lot of list) {
      if (lot.until !== 0 && lot.until <= state.day) {
        expired[id] = (expired[id] ?? 0) + lot.qty;
        expiredCost += lot.qty * lot.cost;
        stock[id] = Math.max(0, (stock[id] ?? 0) - lot.qty);
      } else keep.push(lot);
    }
    lots[id] = keep;
  }
  return { ...state, stock, lots, today: { ...state.today, expired, expiredCost } };
}

/** Số đơn vị sẽ bị bỏ lúc đóng cửa hôm nay (để báo trước ở màn Kho). */
export function expiringToday(state: Pick<ShopState, 'lots' | 'day'>, id: string): number {
  return (state.lots[id] ?? []).filter((l) => l.until !== 0 && l.until <= state.day).reduce((a, l) => a + l.qty, 0);
}

/** Số đơn vị đang trên đường giao. */
export function incomingOf(state: Pick<ShopState, 'incoming'>, id: string): number {
  return state.incoming.filter((d) => d.item === id).reduce((a, d) => a + d.qty, 0);
}

/** Mua nâng cấp hoặc đồ trang trí tiệm bằng tiền két (không mua chịu được). */
export function buyUpgrade(state: ShopState, id: string): InventoryResult {
  const def = getUpgrade(id);
  if (!def) return { ok: false, reason: 'unknown' };
  const list = def.kind === 'upgrade' ? state.upgrades : state.decor;
  if (list.includes(id)) return { ok: false, reason: 'alreadyOwned' };
  if (state.day < def.minDay) return { ok: false, reason: 'tooEarly' };
  if (state.cash < def.price) return { ok: false, reason: 'noMoney' };
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - def.price,
      upgrades: def.kind === 'upgrade' ? [...state.upgrades, id] : state.upgrades,
      decor: def.kind === 'decor' ? [...state.decor, id] : state.decor,
      today: { ...state.today, upgrade: state.today.upgrade + def.price },
    },
  };
}

export function isUnlocked(state: ShopState, kind: 'tea' | 'topping', id: string): boolean {
  return (kind === 'tea' ? state.unlockedTeas : state.unlockedToppings).includes(id);
}

/** Mở khóa món mới: trừ két (không mua chịu được), thêm vào danh sách đã mở, tặng sẵn một gói nhỏ. */
export function unlockItem(state: ShopState, kind: 'tea' | 'topping', id: string): InventoryResult {
  const def = UNLOCKS.find((u) => u.kind === kind && u.id === id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (isUnlocked(state, kind, id)) return { ok: false, reason: 'alreadyUnlocked' };
  if (state.day < def.minDay) return { ok: false, reason: 'tooEarly' };
  if (state.cash < def.price) return { ok: false, reason: 'noMoney' };
  const stockId = kind === 'tea' ? stockIdOfTea(id) : stockIdOfTopping(id);
  const gift: Lot = { qty: packOf(stockId, 'small').size, cost: unitCost(stockId), until: untilFor(stockId, state.day) };
  return {
    ok: true,
    state: {
      ...state,
      ...putStock(state, stockId, gift),
      cash: state.cash - def.price,
      unlockedTeas: kind === 'tea' ? [...state.unlockedTeas, id] : state.unlockedTeas,
      unlockedToppings: kind === 'topping' ? [...state.unlockedToppings, id] : state.unlockedToppings,
      today: { ...state.today, unlock: state.today.unlock + def.price },
    },
  };
}

/** Một ly theo order cần bao nhiêu đơn vị mỗi nguyên liệu (cốc, trà, đường, đá, topping). */
export function needsOf(spec: CupSpec): Record<string, number> {
  const needs: Record<string, number> = { [stockIdOfCup(spec.size)]: 1, [stockIdOfTea(spec.tea)]: 1 };
  const sugar = SUGAR_STEPS.indexOf(spec.sugar);
  const ice = ICE_STEPS.indexOf(spec.ice);
  if (sugar > 0) needs[STOCK_SUGAR] = sugar;
  if (ice > 0) needs[STOCK_ICE] = ice;
  for (const t of spec.toppings) {
    const id = stockIdOfTopping(t.id);
    needs[id] = (needs[id] ?? 0) + t.scoops;
  }
  return needs;
}

/** Cộng nhu cầu của các ly vào bảng (theo nguyên liệu). */
export function addDemand(demand: Record<string, number>, specs: CupSpec[]): Record<string, number> {
  const next = { ...demand };
  for (const spec of specs) for (const [id, n] of Object.entries(needsOf(spec))) next[id] = (next[id] ?? 0) + n;
  return next;
}

/**
 * Nguyên liệu khiến các ly còn lại không làm được (tồn kho không đủ), hoặc null nếu đủ.
 * Dùng khi khách bỏ đi để biết khách bị lỡ vì hết hàng hay vì chờ lâu.
 */
export function missingFor(stock: Record<string, number>, specs: CupSpec[]): string | null {
  const total = addDemand({}, specs);
  for (const [id, n] of Object.entries(total)) if ((stock[id] ?? 0) < n) return id;
  return null;
}
