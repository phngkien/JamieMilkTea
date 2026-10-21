// Tiền: giá ly và định dạng hiển thị kiểu nghìn đồng.
import { SIZES } from '../config/cup';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import type { CupSpec } from './types';

/** Giá ly = giá trà + phụ thu size + giá từng topping (mỗi loại tính một lần). Đơn vị: đồng. */
export function cupPrice(spec: CupSpec): number {
  const toppings = spec.toppings.reduce((sum, t) => sum + getTopping(t.id).price, 0);
  return getTea(spec.tea).price + SIZES[spec.size].surcharge + toppings;
}

/**
 * Hiển thị tiền theo nghìn đồng: 25000 → "25k", 2413500 → "2.413,5k".
 * Dấu chấm ngăn hàng nghìn, dấu phẩy cho phần lẻ (kiểu Việt Nam), tối đa 1 chữ số lẻ.
 */
export function formatMoney(dong: number): string {
  const sign = dong < 0 ? '-' : '';
  // Làm tròn tới 100 đồng (0,1k)
  const tenths = Math.round(Math.abs(dong) / 100);
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  const wholeText = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${wholeText}${decimal ? `,${decimal}` : ''}k`;
}

/** Sao trung bình hiển thị kiểu "4,6". */
export function formatRating(sum: number, count: number): string {
  if (count === 0) return '0';
  return (Math.round((sum / count) * 10) / 10).toFixed(1).replace('.', ',');
}
