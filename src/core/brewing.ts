// Pha ly: các thao tác trên một ly. Hàm thuần: nhận ly cũ, trả ly mới (hoặc lý do từ chối).
import {
  ICE_STEPS,
  MAX_SCOOPS_PER_TOPPING,
  MAX_TOPPING_TYPES,
  OVERFLOW_AT,
  SUGAR_STEPS,
} from '../config/cup';
import { ICE_TEXT, STATUS_TEXT, fill } from '../config/strings';
import type { CupState, IceLevel, RejectReason, Size, SugarLevel } from './types';

export type BrewResult =
  | { ok: true; cup: CupState }
  | { ok: false; reason: RejectReason };

export function createCup(id: string, size: Size): CupState {
  return {
    id,
    size,
    tea: null,
    fill: 0,
    sugarTaps: 0,
    iceScoops: 0,
    toppings: [],
    sealed: false,
    ruined: false,
  };
}

/** Kiểm tra chung: ly đã ép nắp hoặc đã hỏng thì không thêm gì được nữa. */
function checkEditable(cup: CupState): RejectReason | null {
  if (cup.ruined) return 'ruined';
  if (cup.sealed) return 'sealed';
  return null;
}

/**
 * Rót thêm `amount` (phần của ly) trà loại `tea`.
 * Ly chỉ nhận một loại trà. Rót quá miệng ly thì ly bị hỏng.
 */
export function pourTea(cup: CupState, tea: string, amount: number): BrewResult {
  const blocked = checkEditable(cup);
  if (blocked) return { ok: false, reason: blocked };
  if (cup.tea !== null && cup.tea !== tea) return { ok: false, reason: 'differentTea' };
  const newFill = cup.fill + Math.max(0, amount);
  return {
    ok: true,
    cup: { ...cup, tea, fill: newFill, ruined: newFill > OVERFLOW_AT },
  };
}

/** Chạm vòi nước đường: tăng một mức. Đã 100% thì bị chặn. */
export function tapSyrup(cup: CupState): BrewResult {
  const blocked = checkEditable(cup);
  if (blocked) return { ok: false, reason: blocked };
  if (cup.sugarTaps >= SUGAR_STEPS.length - 1) return { ok: false, reason: 'sugarMax' };
  return { ok: true, cup: { ...cup, sugarTaps: cup.sugarTaps + 1 } };
}

/** Xúc thêm một muỗng đá. Đã "bình thường" thì bị chặn. */
export function scoopIce(cup: CupState): BrewResult {
  const blocked = checkEditable(cup);
  if (blocked) return { ok: false, reason: blocked };
  if (cup.iceScoops >= ICE_STEPS.length - 1) return { ok: false, reason: 'iceMax' };
  return { ok: true, cup: { ...cup, iceScoops: cup.iceScoops + 1 } };
}

/** Thêm một muỗng topping. Tối đa 2 muỗng mỗi loại, 2 loại mỗi ly. */
export function addTopping(cup: CupState, topping: string): BrewResult {
  const blocked = checkEditable(cup);
  if (blocked) return { ok: false, reason: blocked };
  const existing = cup.toppings.find((t) => t.id === topping);
  if (existing) {
    if (existing.scoops >= MAX_SCOOPS_PER_TOPPING) return { ok: false, reason: 'toppingMax' };
    return {
      ok: true,
      cup: {
        ...cup,
        toppings: cup.toppings.map((t) => (t.id === topping ? { ...t, scoops: t.scoops + 1 } : t)),
      },
    };
  }
  if (cup.toppings.length >= MAX_TOPPING_TYPES) return { ok: false, reason: 'toppingTypesMax' };
  return { ok: true, cup: { ...cup, toppings: [...cup.toppings, { id: topping, scoops: 1 }] } };
}

/** Ép nắp. Ly rỗng thì chưa ép được. */
export function sealCup(cup: CupState): BrewResult {
  const blocked = checkEditable(cup);
  if (blocked) return { ok: false, reason: blocked };
  if (cup.tea === null || cup.fill <= 0) return { ok: false, reason: 'emptyCup' };
  return { ok: true, cup: { ...cup, sealed: true } };
}

export function sugarOf(cup: CupState): SugarLevel {
  return SUGAR_STEPS[cup.sugarTaps];
}

export function iceOf(cup: CupState): IceLevel {
  return ICE_STEPS[cup.iceScoops];
}

/** Dòng trạng thái dưới ly, ví dụ "Đường 50% · đá bình thường". */
export function describeCupStatus(cup: CupState): string {
  if (cup.ruined) return STATUS_TEXT.ruined;
  const sugar = cup.sugarTaps === 0 ? STATUS_TEXT.sugarNone : fill(STATUS_TEXT.sugar, { p: sugarOf(cup) });
  return sugar + STATUS_TEXT.separator + ICE_TEXT[iceOf(cup)];
}
