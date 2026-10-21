// Độ khó theo ngày (CLAUDE.md mục 9.6). Thời gian tính bằng mili giây.
export interface DayConfig {
  day: number;
  /** Khách đầu tiên đến sau bao lâu kể từ lúc mở cửa. */
  firstArrivalMs: number;
  /** Khoảng cách giữa hai khách: ngẫu nhiên trong [min, max]. */
  arrivalGapMs: [number, number];
  /** Số giây để thanh kiên nhẫn chạy từ đầy về 0 khi khách đứng ở quầy. */
  patienceSeconds: number;
  /** Khách đầu tiên của ngày (lúc có hướng dẫn) kiên nhẫn lâu hơn. */
  firstCustomerPatienceSeconds: number;
  /** Tỉ lệ order có 2 ly. */
  twoCupChance: number;
  /** Trọng số số loại topping trong một ly: [0 loại, 1 loại, 2 loại]. */
  toppingCountWeights: [number, number, number];
  /** Tỉ lệ một loại topping được gọi 2 muỗng. */
  doubleScoopChance: number;
}

export const DAYS: DayConfig[] = [
  {
    day: 1,
    firstArrivalMs: 1500,
    arrivalGapMs: [15000, 25000],
    patienceSeconds: 90,
    firstCustomerPatienceSeconds: 300,
    twoCupChance: 0,
    toppingCountWeights: [3, 5, 2],
    doubleScoopChance: 0.2,
  },
];

/** Khách đang chờ trong hàng (không tính người đang ở quầy) giảm kiên nhẫn chậm hơn. */
export const QUEUE_PATIENCE_FACTOR = 0.5;
/** Tối đa số khách trong tiệm: 1 ở quầy + 3 trong hàng chờ. */
export const MAX_CUSTOMERS = 4;

export function getDayConfig(day: number): DayConfig {
  // Ngày chưa có trong bảng thì dùng ngày cuối cùng có cấu hình.
  return DAYS.find((d) => d.day === day) ?? DAYS[DAYS.length - 1];
}
