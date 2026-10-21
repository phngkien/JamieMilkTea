// Kho: tiêu hao nguyên liệu, nhập hàng, mở khóa món mới. Hàm thuần, không bao giờ để kho âm.
import { UNLOCKS, getStockDef, stockIdOfTea, stockIdOfTopping, unitCost } from '../config/inventory';
import type { RejectReason, ShopState } from './types';

export type InventoryResult = { ok: true; state: ShopState } | { ok: false; reason: RejectReason };

export function stockOf(state: ShopState, id: string): number {
  return state.stock[id] ?? 0;
}

/**
 * Lấy `amount` đơn vị ra khỏi kho. Không đủ thì trả về null (kho giữ nguyên).
 * Trả kèm giá vốn của phần đã lấy để cộng vào ly.
 */
export function consume(
  stock: Record<string, number>,
  id: string,
  amount = 1,
): { stock: Record<string, number>; cost: number } | null {
  const have = stock[id] ?? 0;
  if (have < amount) return null;
  return { stock: { ...stock, [id]: have - amount }, cost: unitCost(id) * amount };
}

/** Nhập một gói nguyên liệu: trừ két, cộng tồn. */
export function restock(state: ShopState, item: string): InventoryResult {
  const def = getStockDef(item);
  if (state.cash < def.packPrice) return { ok: false, reason: 'noMoney' };
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - def.packPrice,
      stock: { ...state.stock, [item]: stockOf(state, item) + def.packSize },
      today: { ...state.today, restock: state.today.restock + def.packPrice },
    },
  };
}

export function isUnlocked(state: ShopState, kind: 'tea' | 'topping', id: string): boolean {
  return (kind === 'tea' ? state.unlockedTeas : state.unlockedToppings).includes(id);
}

/** Mở khóa món mới: trừ két, thêm vào danh sách đã mở, tặng sẵn một gói nguyên liệu. */
export function unlockItem(state: ShopState, kind: 'tea' | 'topping', id: string): InventoryResult {
  const def = UNLOCKS.find((u) => u.kind === kind && u.id === id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (isUnlocked(state, kind, id)) return { ok: false, reason: 'alreadyUnlocked' };
  if (state.day < def.minDay) return { ok: false, reason: 'tooEarly' };
  if (state.cash < def.price) return { ok: false, reason: 'noMoney' };
  const stockId = kind === 'tea' ? stockIdOfTea(id) : stockIdOfTopping(id);
  const pack = getStockDef(stockId).packSize;
  return {
    ok: true,
    state: {
      ...state,
      cash: state.cash - def.price,
      unlockedTeas: kind === 'tea' ? [...state.unlockedTeas, id] : state.unlockedTeas,
      unlockedToppings: kind === 'topping' ? [...state.unlockedToppings, id] : state.unlockedToppings,
      stock: { ...state.stock, [stockId]: stockOf(state, stockId) + pack },
      today: { ...state.today, unlock: state.today.unlock + def.price },
    },
  };
}
