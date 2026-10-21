// Tiền: giá ly và định dạng hiển thị kiểu nghìn đồng.
import { SIZES } from '../config/cup';
import { LEADERBOARD, TIP } from '../config/scoring';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import type { CupStation, CupSpec, StaffDay, StationScores } from './types';

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

/**
 * Tip của một ly: khách hài lòng (điểm ≥ TIP.minScore) cho tip theo giá ly và điểm.
 * `factor` là hệ số từ nâng cấp (hũ tip...). Làm tròn tới TIP.roundTo đồng.
 */
export function tipForCup(price: number, score: number, factor = 1): number {
  if (score < TIP.minScore) return 0;
  const raw = price * TIP.rate * factor * (Math.min(100, score) / 100);
  return Math.round(raw / TIP.roundTo) * TIP.roundTo;
}

/**
 * Chia tip của một ly cho những người đã làm ly đó, theo tỉ lệ điểm trạm (CLAUDE.md mục 12).
 * Một người giữ nhiều trạm thì cộng điểm các trạm đó. Tổng các phần luôn đúng bằng `tip`.
 * Mọi người đều 0 điểm thì chia đều.
 */
export function splitTip(tip: number, shares: { uid: string; score: number }[]): Record<string, number> {
  const byUid = new Map<string, number>();
  for (const s of shares) byUid.set(s.uid, (byUid.get(s.uid) ?? 0) + Math.max(0, s.score));
  const result: Record<string, number> = {};
  if (byUid.size === 0 || tip <= 0) return result;
  const total = [...byUid.values()].reduce((a, b) => a + b, 0);
  const entries = [...byUid.entries()].map(([uid, score]) => {
    const exact = total > 0 ? (tip * score) / total : tip / byUid.size;
    return { uid, exact, whole: Math.floor(exact) };
  });
  // Phần lẻ còn dư chia cho người có phần thập phân lớn nhất trước (tổng không lệch đồng nào)
  let left = tip - entries.reduce((a, e) => a + e.whole, 0);
  const order = [...entries].sort((a, b) => b.exact - b.whole - (a.exact - a.whole) || a.uid.localeCompare(b.uid));
  for (const e of order) {
    if (left <= 0) break;
    e.whole += 1;
    left -= 1;
  }
  for (const e of entries) result[e.uid] = e.whole;
  return result;
}

export function emptyStaffDay(): StaffDay {
  return {
    tips: 0,
    cups: { tea: 0, topping: 0, cashier: 0 },
    score: { tea: 0, topping: 0, cashier: 0 },
    drinks: 0,
    streak: 0,
    bestStreak: 0,
    excellent: 0,
    manage: -1,
  };
}

/**
 * Ghi công một ly vào bảng công sức trong ngày: mỗi người được tính 1 ly + điểm ở mỗi trạm mình làm,
 * cộng phần tip của mình. Điểm cá nhân của ly (trung bình các trạm mình làm) đạt mức "hoàn hảo"
 * thì chuỗi hoàn hảo tăng 1, không thì chuỗi về 0.
 */
export function creditCup(
  staff: Record<string, StaffDay>,
  makers: Partial<Record<CupStation, string>>,
  scores: StationScores,
  tips: Record<string, number>,
): Record<string, StaffDay> {
  const next: Record<string, StaffDay> = { ...staff };
  const touch = (uid: string) => {
    const old = next[uid] ?? emptyStaffDay();
    next[uid] = { ...old, cups: { ...old.cups }, score: { ...old.score } };
    return next[uid];
  };
  // Điểm cá nhân của ly này theo từng người: cộng điểm các trạm người đó làm
  const mine = new Map<string, { sum: number; n: number }>();
  for (const station of Object.keys(makers) as CupStation[]) {
    const uid = makers[station];
    if (!uid) continue;
    const d = touch(uid);
    d.cups[station] += 1;
    d.score[station] += scores[station];
    const m = mine.get(uid) ?? { sum: 0, n: 0 };
    mine.set(uid, { sum: m.sum + scores[station], n: m.n + 1 });
  }
  for (const [uid, m] of mine) {
    const d = next[uid];
    d.drinks += 1;
    d.streak = m.sum / m.n >= LEADERBOARD.perfectScore ? d.streak + 1 : 0;
    d.bestStreak = Math.max(d.bestStreak, d.streak);
  }
  for (const [uid, amount] of Object.entries(tips)) touch(uid).tips += amount;
  return next;
}
