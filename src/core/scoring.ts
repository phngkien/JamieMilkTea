// Chấm điểm ly 0–100 theo CLAUDE.md mục 12. Trọng số nằm trong config/scoring.
import { ICE_STEPS, SIZES, SUGAR_STEPS } from '../config/cup';
import { SCORING, STATION_SCORING } from '../config/scoring';
import { iceOf, sugarOf } from './brewing';
import type { CupScore, CupSpec, CupState, Size, StationScores, ToppingPortion } from './types';

/**
 * Độ chính xác khi rót (0..1).
 * Giữa vùng xanh = 1, mép vùng xanh = pourEdgeAccuracy, ra ngoài thì giảm dần về 0.
 */
export function pourAccuracy(fill: number, size: Size): number {
  const { greenMin, greenMax } = SIZES[size];
  const center = (greenMin + greenMax) / 2;
  const half = (greenMax - greenMin) / 2;
  const distance = Math.abs(fill - center);
  const edge = SCORING.pourEdgeAccuracy;
  if (distance <= half) return 1 - (1 - edge) * (distance / half);
  const outside = (distance - half) / (half * SCORING.pourFalloffHalfZones);
  return Math.max(0, edge * (1 - outside));
}

/** Điểm theo số bậc lệch: đúng = 1, lệch 1 bậc = oneStepOffShare, hơn nữa = 0. */
function stepScore(expectedIndex: number, actualIndex: number): number {
  const diff = Math.abs(expectedIndex - actualIndex);
  if (diff === 0) return 1;
  if (diff === 1) return SCORING.oneStepOffShare;
  return 0;
}

/**
 * Điểm topping (0..1): xét mọi loại topping có trong order hoặc trong ly.
 * Đúng loại + đúng muỗng = 1 phần, đúng loại sai muỗng = nửa phần, thiếu/thừa = 0.
 */
export function toppingAccuracy(expected: ToppingPortion[], actual: ToppingPortion[]): number {
  const ids = new Set([...expected.map((t) => t.id), ...actual.map((t) => t.id)]);
  if (ids.size === 0) return 1;
  let sum = 0;
  for (const id of ids) {
    const want = expected.find((t) => t.id === id);
    const got = actual.find((t) => t.id === id);
    if (want && got) sum += want.scoops === got.scoops ? 1 : SCORING.wrongScoopsShare;
  }
  return sum / ids.size;
}

export function starsFromScore(score: number): number {
  return Math.max(0, Math.min(5, Math.round(score / SCORING.starDivisor)));
}

/** Chấm một ly so với yêu cầu. `patience` là kiên nhẫn còn lại (0..1) lúc giao. */
export function scoreCup(spec: CupSpec, cup: CupState, patience: number): CupScore {
  const sizeOk = spec.size === cup.size;
  const teaOk = spec.tea === cup.tea;
  const parts = {
    size: sizeOk ? SCORING.size : 0,
    // Phần "đúng loại" chỉ có khi đúng trà; độ chính xác vạch rót tính theo size của ly thật.
    tea: teaOk
      ? SCORING.tea * (SCORING.teaTypeShare + (1 - SCORING.teaTypeShare) * pourAccuracy(cup.fill, cup.size))
      : 0,
    sugar:
      SCORING.sugar * stepScore(SUGAR_STEPS.indexOf(spec.sugar), SUGAR_STEPS.indexOf(sugarOf(cup))),
    ice: SCORING.ice * stepScore(ICE_STEPS.indexOf(spec.ice), ICE_STEPS.indexOf(iceOf(cup))),
    topping: SCORING.topping * toppingAccuracy(spec.toppings, cup.toppings),
    patience: SCORING.patience * Math.max(0, Math.min(1, patience)),
  };
  let total = Object.values(parts).reduce((s, v) => s + v, 0);
  const capped = !sizeOk || !teaOk;
  if (capped) total = Math.min(total, SCORING.wrongBaseCap);
  total = Math.round(total);
  return { total, stars: starsFromScore(total), capped, parts };
}

/**
 * Điểm cá nhân 0–100 của từng trạm cho một ly đã giao (CLAUDE.md mục 12).
 * `customerId` là khách nhận ly, `patience` là kiên nhẫn còn lại lúc giao.
 */
export function stationScores(spec: CupSpec, cup: CupState, customerId: string, patience: number): StationScores {
  const W = STATION_SCORING;
  const teaOk = spec.tea === cup.tea;
  const tea =
    (spec.size === cup.size ? W.tea.size : 0) +
    (teaOk ? W.tea.teaType + W.tea.pour * pourAccuracy(cup.fill, cup.size) : 0);
  const topping =
    W.topping.sugar * stepScore(SUGAR_STEPS.indexOf(spec.sugar), SUGAR_STEPS.indexOf(sugarOf(cup))) +
    W.topping.ice * stepScore(ICE_STEPS.indexOf(spec.ice), ICE_STEPS.indexOf(iceOf(cup))) +
    W.topping.topping * toppingAccuracy(spec.toppings, cup.toppings);
  // Ly làm cho khách đang ở quầy lúc lấy cốc: giao cho đúng người đó mới được trọn điểm
  const rightCustomer = cup.forCustomer === null || cup.forCustomer === customerId;
  const cashier =
    (rightCustomer ? W.cashier.rightCustomer : 0) + W.cashier.speed * Math.max(0, Math.min(1, patience));
  return { tea: Math.round(tea), topping: Math.round(topping), cashier: Math.round(cashier) };
}
