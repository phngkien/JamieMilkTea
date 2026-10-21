import type { IceLevel, Size, SugarLevel } from '../core/types';

// Kích cỡ ly, vạch xanh khi rót, tốc độ rót.
// "fill" là mực trà: 0 = ly rỗng, 1 = tới miệng ly. Quá OVERFLOW_AT là tràn.
export interface SizeDef {
  id: Size;
  label: string;
  /** Phụ thu so với giá trà (đồng). */
  surcharge: number;
  /** Vùng xanh: mực trà nằm trong khoảng này là đạt. */
  greenMin: number;
  greenMax: number;
  /** Mực trà tăng bao nhiêu mỗi giây khi giữ bình. */
  pourPerSecond: number;
}

export const SIZES: Record<Size, SizeDef> = {
  M: { id: 'M', label: 'M', surcharge: 0, greenMin: 0.7, greenMax: 0.8, pourPerSecond: 0.38 },
  L: { id: 'L', label: 'L', surcharge: 8000, greenMin: 0.76, greenMax: 0.86, pourPerSecond: 0.32 },
};

export const OVERFLOW_AT = 1;

/** Bảng mức đường: chỉ số = số lần chạm vòi nước đường. */
export const SUGAR_STEPS: SugarLevel[] = [0, 30, 50, 70, 100];

/** Bảng mức đá: chỉ số = số muỗng đá. */
export const ICE_STEPS: IceLevel[] = ['none', 'less', 'normal'];

export const MAX_TOPPING_TYPES = 2;
export const MAX_SCOOPS_PER_TOPPING = 2;

/** Số ly đặt được cùng lúc trên bảng gỗ (Prompt 1: một ly). */
export const BOARD_SLOTS = 1;
