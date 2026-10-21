// Kho hàng: số tồn ban đầu, gói nhập, giá nhập, giá mở khóa. Tiền tính bằng đồng (50000 = 50k).
// Bạn có thể chỉnh các con số ở đây để cân bằng game.
import { TEAS } from './teas';
import { TOPPINGS } from './toppings';

/** Tiền két khi bắt đầu chơi lần đầu. */
export const START_CASH = 500_000;
/** Tiền thuê tiệm, trừ vào két mỗi cuối ngày. */
export const RENT_PER_DAY = 120_000;
/** Còn ít hơn hoặc bằng số này thì nhãn số tồn nhấp nháy cam ("sắp hết"). */
export const LOW_STOCK_AT = 5;

export interface StockDef {
  /** Mã nguyên liệu trong kho, ví dụ 'cup-M', 'tea-milk', 'topping-jelly', 'ice', 'sugar'. */
  id: string;
  name: string;
  /** Số tồn khi bắt đầu chơi (món đang khóa thì là 0). */
  start: number;
  /** Mỗi lần bấm "Nhập" được thêm bao nhiêu đơn vị. */
  packSize: number;
  /** Giá một gói nhập. Giá mỗi đơn vị = packPrice / packSize. */
  packPrice: number;
}

export const stockIdOfCup = (size: 'M' | 'L') => `cup-${size}`;
export const stockIdOfTea = (tea: string) => `tea-${tea}`;
export const stockIdOfTopping = (topping: string) => `topping-${topping}`;
export const STOCK_ICE = 'ice';
export const STOCK_SUGAR = 'sugar';

/** Giá gói nhập (đồng) và số tồn ban đầu của từng loại trà. 1 đơn vị trà = đủ cho 1 ly. */
const TEA_STOCK: Record<string, { start: number; packPrice: number }> = {
  milk: { start: 15, packPrice: 100_000 }, // 5k mỗi ly
  matcha: { start: 15, packPrice: 140_000 }, // 7k mỗi ly
  black: { start: 15, packPrice: 90_000 }, // 4,5k mỗi ly
  green: { start: 0, packPrice: 90_000 },
  oolong: { start: 0, packPrice: 110_000 },
  peach: { start: 0, packPrice: 130_000 },
};
const TEA_PACK = 20;

/** Giá gói 30 muỗng topping. 1 đơn vị = 1 muỗng. */
const TOPPING_STOCK: Record<string, { start: number; packPrice: number }> = {
  'pearl-black': { start: 20, packPrice: 45_000 },
  'pearl-white': { start: 20, packPrice: 60_000 },
  jelly: { start: 20, packPrice: 45_000 },
  pudding: { start: 0, packPrice: 75_000 },
  'red-bean': { start: 0, packPrice: 60_000 },
  'coffee-jelly': { start: 0, packPrice: 60_000 },
  aloe: { start: 0, packPrice: 60_000 },
  'mango-pop': { start: 0, packPrice: 90_000 },
  'taro-ball': { start: 0, packPrice: 75_000 },
  'cheese-cube': { start: 0, packPrice: 105_000 },
  lychee: { start: 0, packPrice: 90_000 },
  strawberry: { start: 0, packPrice: 70_000 },
};
const TOPPING_PACK = 30;

export const STOCK: StockDef[] = [
  { id: stockIdOfCup('M'), name: 'Cốc M', start: 30, packSize: 50, packPrice: 50_000 },
  { id: stockIdOfCup('L'), name: 'Cốc L', start: 30, packSize: 50, packPrice: 75_000 },
  ...TEAS.map((t) => ({
    id: stockIdOfTea(t.id),
    name: t.name,
    start: TEA_STOCK[t.id]?.start ?? 0,
    packSize: TEA_PACK,
    packPrice: TEA_STOCK[t.id]?.packPrice ?? 100_000,
  })),
  ...TOPPINGS.map((t) => ({
    id: stockIdOfTopping(t.id),
    name: t.name,
    start: TOPPING_STOCK[t.id]?.start ?? 0,
    packSize: TOPPING_PACK,
    packPrice: TOPPING_STOCK[t.id]?.packPrice ?? 60_000,
  })),
  { id: STOCK_ICE, name: 'Đá viên', start: 60, packSize: 40, packPrice: 20_000 },
  { id: STOCK_SUGAR, name: 'Nước đường', start: 60, packSize: 40, packPrice: 20_000 },
];

export function getStockDef(id: string): StockDef {
  const def = STOCK.find((s) => s.id === id);
  if (!def) throw new Error(`Không có nguyên liệu "${id}"`);
  return def;
}

/** Giá vốn một đơn vị (đồng). */
export function unitCost(id: string): number {
  const def = getStockDef(id);
  return def.packPrice / def.packSize;
}

export interface UnlockDef {
  kind: 'tea' | 'topping';
  id: string;
  price: number;
  /** Từ ngày này mới được mở khóa. */
  minDay: number;
}

/** Món mới mở bằng tiền két. Mở xong được tặng sẵn 1 gói nguyên liệu. */
export const UNLOCKS: UnlockDef[] = [
  { kind: 'topping', id: 'pudding', price: 150_000, minDay: 2 },
  { kind: 'tea', id: 'green', price: 250_000, minDay: 2 },
  { kind: 'topping', id: 'red-bean', price: 180_000, minDay: 3 },
  { kind: 'topping', id: 'coffee-jelly', price: 200_000, minDay: 3 },
  { kind: 'tea', id: 'oolong', price: 300_000, minDay: 3 },
  { kind: 'topping', id: 'aloe', price: 220_000, minDay: 4 },
  { kind: 'tea', id: 'peach', price: 400_000, minDay: 4 },
  { kind: 'topping', id: 'mango-pop', price: 250_000, minDay: 4 },
  { kind: 'topping', id: 'taro-ball', price: 280_000, minDay: 5 },
  { kind: 'topping', id: 'strawberry', price: 280_000, minDay: 5 },
  { kind: 'topping', id: 'lychee', price: 320_000, minDay: 6 },
  { kind: 'topping', id: 'cheese-cube', price: 350_000, minDay: 6 },
];

export function startingStock(): Record<string, number> {
  return Object.fromEntries(STOCK.map((s) => [s.id, s.start]));
}
