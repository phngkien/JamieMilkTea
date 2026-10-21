// Ly nhựa trong: trà, đá, topping, nắp ép. Khung 120×180, đáy ly ở y = 172.
// Trong game ly được ghép từ nhiều lớp (thân sau, nước trà vẽ động, đá, topping, viền trước, nắp)
// để mực trà dâng và đá/topping rơi được. cupSvg() ghép sẵn tất cả (dùng cho trang xem trước).
import { PALETTE } from '../config/palette';
import { piece, type ToppingShape } from './toppingTray';
import { seeded, shade, stroke, svg, uid } from './svg';

export const CUP_W = 120;
export const CUP_H = 180;
/** Hình học thân ly (đơn vị khung 120×180). */
export const CUP_TOP_Y = 22;
export const CUP_BOTTOM_Y = 172;
export const CUP_TOP_HALF = 52;
export const CUP_BOTTOM_HALF = 39;

export interface CupArt {
  /** Màu trà, null = ly trống. */
  tea: string | null;
  /** Mực trà 0..1 (1 = miệng ly). */
  fill: number;
  ice: number;
  /** Topping: màu và số hạt. */
  toppings: { color: string; count: number; shape?: ToppingShape }[];
  sealed: boolean;
  straw?: boolean;
}

/** Nửa chiều rộng ly ở độ cao t (0 = đáy, 1 = miệng). */
export function cupHalfAt(t: number): number {
  return CUP_BOTTOM_HALF + (CUP_TOP_HALF - CUP_BOTTOM_HALF) * t;
}

export function cupYAt(t: number): number {
  return CUP_BOTTOM_Y - (CUP_BOTTOM_Y - CUP_TOP_Y) * t;
}

/** Hình thang thân ly từ độ cao t0 tới t1. */
export function cupBand(t0: number, t1: number, cx = CUP_W / 2): string {
  return `M${cx - cupHalfAt(t0)} ${cupYAt(t0)} L${cx + cupHalfAt(t0)} ${cupYAt(t0)} L${cx + cupHalfAt(t1)} ${cupYAt(t1)} L${cx - cupHalfAt(t1)} ${cupYAt(t1)} Z`;
}

/** Lớp sau: bóng đổ + thân nhựa trong. */
export function cupBackSvg(): string {
  const cx = CUP_W / 2;
  return svg(
    CUP_W,
    CUP_H,
    `<ellipse cx="${cx}" cy="${CUP_BOTTOM_Y + 3}" rx="${CUP_BOTTOM_HALF + 6}" ry="5" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="${cupBand(0, 1)}" fill="#FFFFFF" fill-opacity="0.6"/>`,
  );
}

/** Lớp trước: vệt sáng + viền + vành miệng ly. */
export function cupFrontSvg(): string {
  const cx = CUP_W / 2;
  return svg(
    CUP_W,
    CUP_H,
    `<path d="M${cx - cupHalfAt(0.92) + 8} ${cupYAt(0.88)} L${cx - cupHalfAt(0.12) + 8} ${cupYAt(0.12)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
     <path d="M${cx + cupHalfAt(0.8) - 9} ${cupYAt(0.78)} L${cx + cupHalfAt(0.62) - 9} ${cupYAt(0.6)}" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
     <path d="${cupBand(0, 1)}" fill="none" ${stroke(3)}/>
     <path d="M${cx - CUP_TOP_HALF - 3} ${CUP_TOP_Y} h${(CUP_TOP_HALF + 3) * 2}" ${stroke(4)}/>`,
  );
}

/** Nắp màng ép (đặt lên miệng ly). Khung 120×30, mép dưới trùng miệng ly ở y = 22. */
export function lidSvg(): string {
  const cx = CUP_W / 2;
  return svg(
    CUP_W,
    30,
    `<rect x="${cx - CUP_TOP_HALF - 5}" y="${CUP_TOP_Y - 9}" width="${(CUP_TOP_HALF + 5) * 2}" height="12" rx="6" fill="${PALETTE.pinkLight}" ${stroke(2.5)}/>
     <path d="M${cx - 40} ${CUP_TOP_Y - 3} h80" ${stroke(2, PALETTE.pink)} stroke-dasharray="6 6"/>`,
  );
}

/** Một viên đá. Khung 24×24. */
export function iceCubeSvg(): string {
  return svg(
    24,
    24,
    `<rect x="3" y="3" width="18" height="18" rx="4" fill="#F2FBFF" fill-opacity="0.85" ${stroke(1.6, '#8DBBD3')}/>
     <path d="M7 8 h5" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>`,
  );
}

/** Một hạt topping. Khung 28×28. */
export function toppingPieceSvg(shape: ToppingShape, color: string): string {
  return svg(28, 28, piece(shape, 14, 14, color, 9, 0));
}

/** Ống hút. Khung 40×120. */
export function strawSvg(): string {
  return svg(40, 120, `<path d="M8 116 L30 6" ${stroke(10)}/><path d="M8 116 L30 6" stroke="${PALETTE.pink}" stroke-width="6" stroke-linecap="round"/>`);
}

/** Ly ghép sẵn đủ lớp (trang xem trước, hình minh họa). */
export function cupSvg(a: CupArt): string {
  const cx = CUP_W / 2;
  const clip = uid('cupclip');
  const rand = seeded(7);
  let inside = '';
  if (a.tea && a.fill > 0) {
    const f = Math.min(1, a.fill);
    const y = cupYAt(f);
    inside += `<path d="${cupBand(0, f)}" fill="${a.tea}"/>`;
    inside += `<path d="M${cx - cupHalfAt(f)} ${y} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 L${cx + cupHalfAt(f)} ${y + 8} L${cx - cupHalfAt(f)} ${y + 8} Z" fill="${shade(a.tea, 0.25)}"/>`;
  }
  let n = 0;
  for (const t of a.toppings) {
    for (let i = 0; i < t.count; i++, n++) {
      const row = Math.floor(n / 6);
      const col = n % 6;
      inside += piece(t.shape ?? 'pearl', cx - CUP_BOTTOM_HALF + 9 + col * 12.5 + (row % 2) * 6, CUP_BOTTOM_Y - 8 - row * 10, t.color, 6, rand() * 30 - 15);
    }
  }
  for (let i = 0; i < a.ice; i++) {
    const x = cx - 34 + rand() * 52;
    const y = cupYAt(0.35 + rand() * 0.35);
    inside += `<rect x="${x}" y="${y}" width="17" height="17" rx="4" transform="rotate(${-15 + rand() * 30} ${x + 8} ${y + 8})" fill="#F2FBFF" fill-opacity="0.8" ${stroke(1.5, '#8DBBD3')}/>`;
  }
  const lid = a.sealed
    ? `<rect x="${cx - CUP_TOP_HALF - 5}" y="${CUP_TOP_Y - 9}" width="${(CUP_TOP_HALF + 5) * 2}" height="12" rx="6" fill="${PALETTE.pinkLight}" ${stroke(2.5)}/>
       <path d="M${cx - 40} ${CUP_TOP_Y - 3} h80" ${stroke(2, PALETTE.pink)} stroke-dasharray="6 6"/>`
    : '';
  const straw = a.straw
    ? `<path d="M${cx + 8} ${cupYAt(0.5)} L${cx + 22} 0" ${stroke(9)} /><path d="M${cx + 8} ${cupYAt(0.5)} L${cx + 22} 0" stroke="${PALETTE.pink}" stroke-width="5" stroke-linecap="round"/>`
    : '';
  return svg(
    CUP_W,
    CUP_H,
    `<defs><clipPath id="${clip}"><path d="${cupBand(0, 1)}"/></clipPath></defs>
     <ellipse cx="${cx}" cy="${CUP_BOTTOM_Y + 3}" rx="${CUP_BOTTOM_HALF + 6}" ry="5" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="${cupBand(0, 1)}" fill="#FFFFFF" fill-opacity="0.55"/>
     ${straw}
     <g clip-path="url(#${clip})">${inside}</g>
     <path d="M${cx - cupHalfAt(0.92) + 8} ${cupYAt(0.88)} L${cx - cupHalfAt(0.12) + 8} ${cupYAt(0.12)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
     <path d="${cupBand(0, 1)}" fill="none" ${stroke(3)}/>
     <path d="M${cx - CUP_TOP_HALF - 3} ${CUP_TOP_Y} h${(CUP_TOP_HALF + 3) * 2}" ${stroke(4)}/>
     ${lid}`,
  );
}
