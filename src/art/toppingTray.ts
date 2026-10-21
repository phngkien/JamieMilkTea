// Khay inox đựng topping. Khung 240×160. Mỗi loại topping có hình hạt riêng.
import { PALETTE } from '../config/palette';
import { seeded, shade, stroke, svg } from './svg';

export const TRAY_W = 240;
export const TRAY_H = 160;

export type ToppingShape = 'pearl' | 'cube' | 'jelly' | 'bean' | 'blob';

export interface TrayArt {
  color: string;
  shape: ToppingShape;
  /** 0..1: khay đầy hay vơi. */
  amount: number;
  locked?: boolean;
  seed?: number;
  /** Chiều rộng khay (chiều cao luôn là 160) — để khay vừa khít ô trên kệ. */
  width?: number;
}

export function piece(shape: ToppingShape, x: number, y: number, color: string, r: number, rot: number): string {
  const hl = `<circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#FFFFFF" opacity="0.6"/>`;
  switch (shape) {
    case 'cube':
      return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.35}" transform="rotate(${rot} ${x} ${y})" fill="${color}" ${stroke(2)}/>${hl}`;
    case 'jelly':
      return `<rect x="${x - r * 1.2}" y="${y - r * 0.6}" width="${r * 2.4}" height="${r * 1.2}" rx="${r * 0.5}" transform="rotate(${rot} ${x} ${y})" fill="${color}" fill-opacity="0.85" ${stroke(2)}/>`;
    case 'bean':
      return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" transform="rotate(${rot} ${x} ${y})" fill="${color}" ${stroke(2)}/>${hl}`;
    case 'blob':
      return `<path d="M${x - r} ${y} q0 -${r} ${r} -${r} q${r} 0 ${r} ${r} q0 ${r * 0.8} -${r} ${r * 0.8} q-${r} 0 -${r} -${r * 0.8} Z" fill="${color}" ${stroke(2)}/>`;
    default:
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${stroke(2)}/>${hl}`;
  }
}

export function toppingTraySvg(a: TrayArt): string {
  const rand = seeded(a.seed ?? 3);
  const color = a.locked ? '#CFC6BD' : a.color;
  const W = Math.max(160, a.width ?? TRAY_W);
  // Hạt xếp theo lưới, lệch ngẫu nhiên một chút; hàng dưới đầy trước rồi mới chồng lên
  const cols = Math.max(4, Math.floor((W - 70) / 27) + 1);
  const count = Math.round(cols * (1 + 3 * Math.max(0, Math.min(1, a.amount))));
  let pieces = '';
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = 40 + col * ((W - 80) / (cols - 1)) + (row % 2) * 10 + (rand() - 0.5) * 8;
    const y = 118 - row * 20 + (rand() - 0.5) * 8;
    pieces += piece(a.shape, x, y, i % 4 === 0 ? shade(color, 0.12) : color, 12 + rand() * 2, rand() * 40 - 20);
  }
  return svg(
    W,
    TRAY_H,
    `<rect x="4" y="10" width="${W - 8}" height="144" rx="18" fill="#C9C4BE" ${stroke()}/>
     <rect x="16" y="20" width="${W - 32}" height="122" rx="12" fill="#E9E6E2" ${stroke(2.5)}/>
     <rect x="22" y="44" width="${W - 44}" height="94" rx="10" fill="${shade('#E9E6E2', -0.1)}"/>
     ${pieces}
     <path d="M24 24 h80" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
     ${a.locked ? `<rect x="16" y="20" width="${W - 32}" height="122" rx="12" fill="${PALETTE.cream}" opacity="0.45"/>` : ''}`,
  );
}

/** Ổ khóa vàng. Khung 60×64. */
export function lockSvg(): string {
  return svg(
    60,
    64,
    `<path d="M16 30 V20 Q16 6 30 6 Q44 6 44 20 V30" fill="none" ${stroke(6)}/>
     <path d="M16 30 V20 Q16 6 30 6 Q44 6 44 20 V30" fill="none" stroke="#E3E0DC" stroke-width="2.5"/>
     <rect x="8" y="28" width="44" height="32" rx="8" fill="${PALETTE.gold}" ${stroke()}/>
     <circle cx="30" cy="42" r="5" fill="${PALETTE.outline}"/><rect x="28" y="44" width="4" height="9" rx="2" fill="${PALETTE.outline}"/>
     <path d="M14 34 h10" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`,
  );
}
