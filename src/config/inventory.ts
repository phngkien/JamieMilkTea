// Kho hàng: số tồn ban đầu, gói nhập, giá nhập, hạn dùng, giá mở khóa. Tiền tính bằng đồng (50000 = 50k).
// Bạn có thể chỉnh các con số ở đây để cân bằng game.
import { TEAS } from './teas';
import { TOPPINGS } from './toppings';

/** Tiền két khi bắt đầu chơi lần đầu. */
export const START_CASH = 500_000;
/** Tiền thuê tiệm, trừ vào két mỗi cuối ngày. */
export const RENT_PER_DAY = 120_000;
/** Còn ít hơn hoặc bằng số này thì nhãn số tồn nhấp nháy cam ("sắp hết"). */
export const LOW_STOCK_AT = 5;

/** Cỡ gói nhập: gói nhỏ (đắt hơn mỗi phần, ít thừa) hoặc gói lớn (rẻ hơn mỗi phần, dễ thừa). */
export type PackSize = 'small' | 'big';

export interface StockDef {
  /** Mã nguyên liệu trong kho, ví dụ 'cup-M', 'tea-milk', 'topping-jelly', 'ice', 'sugar'. */
  id: string;
  name: string;
  /** Số tồn khi bắt đầu chơi (món đang khóa thì là 0). */
  start: number;
  /** Gói lớn: bao nhiêu đơn vị và giá bao nhiêu. Giá chuẩn mỗi đơn vị = packPrice / packSize. */
  packSize: number;
  packPrice: number;
  /** Gói nhỏ. */
  smallSize: number;
  smallPrice: number;
  /**
   * Dùng được bao nhiêu ngày kể cả ngày nhập (1 = cuối ngày là bỏ). 0 = đồ khô, không hỏng.
   * Phần còn lại khi hết hạn bị bỏ đi, tính vào hao phí.
   */
  shelfLife: number;
}

export const stockIdOfCup = (size: 'M' | 'L') => `cup-${size}`;
export const stockIdOfTea = (tea: string) => `tea-${tea}`;
export const stockIdOfTopping = (topping: string) => `topping-${topping}`;
export const STOCK_ICE = 'ice';
export const STOCK_SUGAR = 'sugar';

/** Gói nhỏ đắt hơn gói lớn bao nhiêu (tính trên mỗi đơn vị). 1.2 = đắt hơn 20%. */
export const SMALL_PACK_MARKUP = 1.2;

/** Nhập gấp trong giờ mở cửa: giá nhân hệ số này và phải chờ giao hàng. */
export const RUSH = {
  priceFactor: 1.5,
  /** Thời gian chờ giao (ms thời gian thật). */
  deliveryMs: 15_000,
};

/**
 * Mua chịu với nhà cung cấp (chống kẹt khi két hết tiền): nhập hàng được ghi nợ tối đa `limit`.
 * Cuối ngày tự trả nợ bằng phần két vượt quá `keepCash` (để luôn còn tiền nhập hàng sáng hôm sau).
 * Tiền thuê tiệm luôn trả được: thiếu thì ghi nợ, kể cả khi vượt hạn mức.
 */
export const CREDIT = {
  limit: 300_000,
  keepCash: 150_000,
};

/** Tính giá gói nhỏ từ giá gói lớn, làm tròn tới 1.000 đồng. */
function smallPrice(bigPrice: number, bigSize: number, smallSize: number): number {
  return Math.round(((bigPrice / bigSize) * smallSize * SMALL_PACK_MARKUP) / 1000) * 1000;
}

/** Trà pha sẵn trong bình: 1 đơn vị = đủ cho 1 ly. Trà pha trong ngày nên cuối ngày phải bỏ.
 * Số tồn ban đầu vừa đủ cho ngày 1 (khoảng 10 ly) để người mới không bị bỏ phí nhiều. */
const TEA_STOCK: Record<string, { start: number; packPrice: number }> = {
  milk: { start: 4, packPrice: 100_000 }, // 5k mỗi ly
  matcha: { start: 4, packPrice: 140_000 }, // 7k mỗi ly
  black: { start: 4, packPrice: 90_000 }, // 4,5k mỗi ly
  green: { start: 0, packPrice: 90_000 },
  oolong: { start: 0, packPrice: 110_000 },
  peach: { start: 0, packPrice: 130_000 },
};
const TEA_PACK = 20;
const TEA_SMALL = 5;
const TEA_SHELF_LIFE = 1;

/** Topping: 1 đơn vị = 1 muỗng. Giá là gói lớn 30 muỗng. shelfLife: số ngày dùng được (0 = không hỏng). */
const TOPPING_STOCK: Record<string, { start: number; packPrice: number; shelfLife: number }> = {
  // Trân châu nấu trong ngày: cuối ngày bỏ
  'pearl-black': { start: 6, packPrice: 45_000, shelfLife: 1 },
  'pearl-white': { start: 6, packPrice: 60_000, shelfLife: 1 },
  'taro-ball': { start: 0, packPrice: 75_000, shelfLife: 1 },
  // Thạch dừa đóng hộp: không hỏng
  jelly: { start: 20, packPrice: 45_000, shelfLife: 0 },
  pudding: { start: 0, packPrice: 75_000, shelfLife: 2 },
  'red-bean': { start: 0, packPrice: 60_000, shelfLife: 2 },
  'coffee-jelly': { start: 0, packPrice: 60_000, shelfLife: 3 },
  aloe: { start: 0, packPrice: 60_000, shelfLife: 3 },
  'mango-pop': { start: 0, packPrice: 90_000, shelfLife: 3 },
  'cheese-cube': { start: 0, packPrice: 105_000, shelfLife: 2 },
  lychee: { start: 0, packPrice: 90_000, shelfLife: 2 },
  strawberry: { start: 0, packPrice: 70_000, shelfLife: 2 },
};
const TOPPING_PACK = 30;
const TOPPING_SMALL = 10;

function def(id: string, name: string, start: number, packSize: number, packPrice: number, small: number, shelfLife: number): StockDef {
  return { id, name, start, packSize, packPrice, smallSize: small, smallPrice: smallPrice(packPrice, packSize, small), shelfLife };
}

export const STOCK: StockDef[] = [
  def(stockIdOfCup('M'), 'Cốc M', 30, 50, 50_000, 20, 0),
  def(stockIdOfCup('L'), 'Cốc L', 30, 50, 75_000, 20, 0),
  ...TEAS.map((t) =>
    def(stockIdOfTea(t.id), t.name, TEA_STOCK[t.id]?.start ?? 0, TEA_PACK, TEA_STOCK[t.id]?.packPrice ?? 100_000, TEA_SMALL, TEA_SHELF_LIFE),
  ),
  ...TOPPINGS.map((t) =>
    def(
      stockIdOfTopping(t.id),
      t.name,
      TOPPING_STOCK[t.id]?.start ?? 0,
      TOPPING_PACK,
      TOPPING_STOCK[t.id]?.packPrice ?? 60_000,
      TOPPING_SMALL,
      TOPPING_STOCK[t.id]?.shelfLife ?? 2,
    ),
  ),
  // Đá tan hết trong ngày
  def(STOCK_ICE, 'Đá viên', 12, 40, 20_000, 10, 1),
  def(STOCK_SUGAR, 'Nước đường', 40, 40, 20_000, 10, 0),
];

export function getStockDef(id: string): StockDef {
  const def = STOCK.find((s) => s.id === id);
  if (!def) throw new Error(`Không có nguyên liệu "${id}"`);
  return def;
}

/** Giá vốn chuẩn một đơn vị (đồng), tính theo gói lớn. */
export function unitCost(id: string): number {
  const def = getStockDef(id);
  return def.packPrice / def.packSize;
}

/** Số đơn vị và giá gốc (chưa giảm, chưa nhân nhập gấp) của một gói. */
export function packOf(id: string, pack: PackSize): { size: number; price: number } {
  const d = getStockDef(id);
  return pack === 'small' ? { size: d.smallSize, price: d.smallPrice } : { size: d.packSize, price: d.packPrice };
}

export interface UnlockDef {
  kind: 'tea' | 'topping';
  id: string;
  price: number;
  /** Từ ngày này mới được mở khóa. */
  minDay: number;
}

/** Món mới mở bằng tiền két. Mở xong được tặng sẵn 1 gói nhỏ nguyên liệu. */
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
