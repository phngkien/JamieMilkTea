// Độ khó theo ngày (CLAUDE.md mục 9.6) và đồng hồ ngày (mục 9.5). Thời gian tính bằng mili giây.

/** Một ngày trong game dài bao nhiêu thời gian thật (mặc định 4 phút). */
export const DAY_LENGTH_MS = 4 * 60 * 1000;
/** Giờ mở cửa và đóng cửa trong game (giờ, 0–24). */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 20;
/** Khách đến rải đều trong phần đầu ngày này (để kịp phục vụ trước giờ đóng cửa). */
export const ARRIVAL_SPREAD = 0.8;
/** Khoảng cách giữa hai khách lệch ngẫu nhiên ± tỉ lệ này. */
export const ARRIVAL_JITTER = 0.35;

export interface DayConfig {
  day: number;
  /** Số khách trong ngày (chưa tính khách thêm nhờ sao cao). */
  customers: number;
  /** Khách đầu tiên đến sau bao lâu kể từ lúc mở cửa. */
  firstArrivalMs: number;
  /** Số giây để thanh kiên nhẫn chạy từ đầy về 0 khi khách đứng ở quầy. */
  patienceSeconds: number;
  /** Tỉ lệ order có 2 ly. */
  twoCupChance: number;
  /** Trọng số số loại topping trong một ly: [0 loại, 1 loại, 2 loại]. */
  toppingCountWeights: [number, number, number];
  /** Tỉ lệ một loại topping được gọi 2 muỗng. */
  doubleScoopChance: number;
}

export const DAYS: DayConfig[] = [
  { day: 1, customers: 10, firstArrivalMs: 1500, patienceSeconds: 90, twoCupChance: 0, toppingCountWeights: [3, 5, 2], doubleScoopChance: 0.2 },
  { day: 2, customers: 12, firstArrivalMs: 1500, patienceSeconds: 85, twoCupChance: 0.1, toppingCountWeights: [3, 5, 2], doubleScoopChance: 0.25 },
  { day: 3, customers: 14, firstArrivalMs: 1500, patienceSeconds: 80, twoCupChance: 0.15, toppingCountWeights: [2, 5, 3], doubleScoopChance: 0.3 },
  { day: 4, customers: 16, firstArrivalMs: 1500, patienceSeconds: 75, twoCupChance: 0.2, toppingCountWeights: [2, 5, 3], doubleScoopChance: 0.3 },
  { day: 5, customers: 18, firstArrivalMs: 1500, patienceSeconds: 70, twoCupChance: 0.25, toppingCountWeights: [2, 4, 4], doubleScoopChance: 0.35 },
  // Từ ngày 6: số khách giữ nguyên, order phức tạp hơn và khách ít kiên nhẫn hơn
  { day: 6, customers: 18, firstArrivalMs: 1500, patienceSeconds: 68, twoCupChance: 0.28, toppingCountWeights: [2, 4, 4], doubleScoopChance: 0.38 },
  { day: 7, customers: 18, firstArrivalMs: 1500, patienceSeconds: 66, twoCupChance: 0.3, toppingCountWeights: [1, 4, 5], doubleScoopChance: 0.4 },
  { day: 8, customers: 18, firstArrivalMs: 1500, patienceSeconds: 64, twoCupChance: 0.32, toppingCountWeights: [1, 4, 5], doubleScoopChance: 0.42 },
  { day: 9, customers: 18, firstArrivalMs: 1500, patienceSeconds: 62, twoCupChance: 0.34, toppingCountWeights: [1, 3, 6], doubleScoopChance: 0.44 },
  { day: 10, customers: 18, firstArrivalMs: 1500, patienceSeconds: 60, twoCupChance: 0.35, toppingCountWeights: [1, 3, 6], doubleScoopChance: 0.45 },
];

/** Khách đầu tiên của ngày 1 (lúc có hướng dẫn) kiên nhẫn lâu hơn. */
export const TUTORIAL_PATIENCE_SECONDS = 300;

/** Sao trung bình cao thì có thêm khách mỗi ngày: [sao tối thiểu, số khách thêm]. Xét từ cao xuống thấp. */
export const RATING_BONUS: [number, number][] = [
  [4.5, 2],
  [4.0, 1],
];

/** Khách đang chờ trong hàng (không tính người đang ở quầy) giảm kiên nhẫn chậm hơn. */
export const QUEUE_PATIENCE_FACTOR = 0.5;
/** Tối đa số khách trong tiệm: 1 ở quầy + 3 trong hàng chờ. */
export const MAX_CUSTOMERS = 4;
/** Lịch sử tổng kết giữ tối đa bao nhiêu ngày gần nhất. */
export const HISTORY_LIMIT = 60;

export function getDayConfig(day: number): DayConfig {
  // Ngày chưa có trong bảng thì dùng ngày cuối cùng có cấu hình.
  return DAYS.find((d) => d.day === day) ?? DAYS[DAYS.length - 1];
}
