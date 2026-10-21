// Ly nhựa trong: trà, đá, topping, nắp ép. Khung 120×180, đáy ly ở y = 172.
import { PALETTE } from '../config/palette';
import { seeded, shade, stroke, svg, uid } from './svg';

export const CUP_W = 120;
export const CUP_H = 180;
const TOP_Y = 22;
const BOTTOM_Y = 172;
const TOP_HALF = 52;
const BOTTOM_HALF = 39;

export interface CupArt {
  /** Màu trà, null = ly trống. */
  tea: string | null;
  /** Mực trà 0..1 (1 = miệng ly). */
  fill: number;
  ice: number;
  /** Topping: màu và số hạt. */
  toppings: { color: string; count: number }[];
  sealed: boolean;
  straw?: boolean;
}

/** Nửa chiều rộng ly ở độ cao t (0 = đáy, 1 = miệng). */
function halfAt(t: number): number {
  return BOTTOM_HALF + (TOP_HALF - BOTTOM_HALF) * t;
}

function yAt(t: number): number {
  return BOTTOM_Y - (BOTTOM_Y - TOP_Y) * t;
}

/** Hình thang thân ly từ độ cao t0 tới t1. */
export function cupBand(t0: number, t1: number, cx = CUP_W / 2): string {
  return `M${cx - halfAt(t0)} ${yAt(t0)} L${cx + halfAt(t0)} ${yAt(t0)} L${cx + halfAt(t1)} ${yAt(t1)} L${cx - halfAt(t1)} ${yAt(t1)} Z`;
}

export function cupSvg(a: CupArt): string {
  const cx = CUP_W / 2;
  const clip = uid('cupclip');
  const rand = seeded(7);
  let inside = '';
  // Trà
  if (a.tea && a.fill > 0) {
    const f = Math.min(1, a.fill);
    const y = yAt(f);
    inside += `<path d="${cupBand(0, f)}" fill="${a.tea}"/>`;
    // Lớp sữa sáng hơn phía trên + gợn mặt nước
    inside += `<path d="M${cx - halfAt(f)} ${y} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 L${cx + halfAt(f)} ${y + 8} L${cx - halfAt(f)} ${y + 8} Z" fill="${shade(a.tea, 0.25)}"/>`;
  }
  // Topping dưới đáy
  let n = 0;
  for (const t of a.toppings) {
    for (let i = 0; i < t.count; i++, n++) {
      const row = Math.floor(n / 6);
      const col = n % 6;
      const x = cx - BOTTOM_HALF + 9 + col * 12.5 + (row % 2) * 6;
      const y = BOTTOM_Y - 8 - row * 10;
      inside += `<circle cx="${x}" cy="${y}" r="6" fill="${t.color}" ${stroke(1.5)}/>
        <circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#FFFFFF" opacity="0.7"/>`;
    }
  }
  // Đá viên
  for (let i = 0; i < a.ice; i++) {
    const x = cx - 34 + rand() * 52;
    const y = yAt(0.35 + rand() * 0.35);
    const r = -15 + rand() * 30;
    inside += `<rect x="${x}" y="${y}" width="17" height="17" rx="4" transform="rotate(${r} ${x + 8} ${y + 8})" fill="#F2FBFF" fill-opacity="0.8" ${stroke(1.5, '#8DBBD3')}/>`;
  }

  const lid = a.sealed
    ? `<rect x="${cx - TOP_HALF - 5}" y="${TOP_Y - 9}" width="${(TOP_HALF + 5) * 2}" height="12" rx="6" fill="${PALETTE.pinkLight}" ${stroke(2.5)}/>
       <path d="M${cx - 40} ${TOP_Y - 3} h80" ${stroke(2, PALETTE.pink)} stroke-dasharray="6 6"/>`
    : '';
  const straw = a.straw
    ? `<path d="M${cx + 8} ${yAt(0.5)} L${cx + 22} 0" ${stroke(9)} /><path d="M${cx + 8} ${yAt(0.5)} L${cx + 22} 0" stroke="${PALETTE.pink}" stroke-width="5" stroke-linecap="round"/>`
    : '';

  return svg(
    CUP_W,
    CUP_H,
    `<defs><clipPath id="${clip}"><path d="${cupBand(0, 1)}"/></clipPath></defs>
     <ellipse cx="${cx}" cy="${BOTTOM_Y + 3}" rx="${BOTTOM_HALF + 6}" ry="5" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="${cupBand(0, 1)}" fill="#FFFFFF" fill-opacity="0.55"/>
     ${straw}
     <g clip-path="url(#${clip})">${inside}</g>
     <path d="M${cx - halfAt(0.92) + 8} ${yAt(0.88)} L${cx - halfAt(0.12) + 8} ${yAt(0.12)}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
     <path d="${cupBand(0, 1)}" fill="none" ${stroke(3)}/>
     <path d="M${cx - TOP_HALF - 3} ${TOP_Y} h${(TOP_HALF + 3) * 2}" ${stroke(4)}/>
     ${lid}`,
  );
}
