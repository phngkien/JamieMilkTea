// Bình trà thủy tinh có vòi inox. Khung 140×300.
import { PALETTE } from '../config/palette';
import { shade, stroke, svg, uid } from './svg';

export const DISPENSER_W = 140;
export const DISPENSER_H = 300;

export interface DispenserArt {
  tea: string;
  /** Mực trà trong bình 0..1. */
  level: number;
  locked?: boolean;
}

export function dispenserSvg(a: DispenserArt): string {
  const clip = uid('jar');
  const tea = a.locked ? '#CFC6BD' : a.tea;
  const top = 46;
  const bottom = 236;
  const liquidTop = bottom - (bottom - top - 20) * Math.max(0.08, Math.min(1, a.level));
  return svg(
    DISPENSER_W,
    DISPENSER_H,
    `<defs><clipPath id="${clip}"><rect x="16" y="${top}" width="108" height="${bottom - top}" rx="22"/></clipPath></defs>
     <ellipse cx="70" cy="292" rx="52" ry="6" fill="${PALETTE.outline}" opacity="0.15"/>
     <!-- chân đế gỗ -->
     <rect x="22" y="236" width="96" height="22" rx="8" fill="${PALETTE.woodLight}" ${stroke()}/>
     <!-- vòi inox -->
     <rect x="58" y="252" width="24" height="16" rx="4" fill="#D9D6D2" ${stroke()}/>
     <path d="M62 268 L62 284 Q70 290 78 284 L78 268" fill="#C7C2BD" ${stroke()}/>
     <rect x="80" y="246" width="24" height="10" rx="5" fill="${PALETTE.woodDark}" ${stroke(2.5)}/>
     <!-- thân thủy tinh -->
     <rect x="16" y="${top}" width="108" height="${bottom - top}" rx="22" fill="#F4FAFB" fill-opacity="0.9"/>
     <g clip-path="url(#${clip})">
       <rect x="10" y="${liquidTop}" width="120" height="${bottom - liquidTop + 10}" fill="${tea}"/>
       <path d="M10 ${liquidTop} q15 -6 30 0 t30 0 t30 0 t30 0 v10 h-120 Z" fill="${shade(tea, 0.22)}"/>
     </g>
     <rect x="16" y="${top}" width="108" height="${bottom - top}" rx="22" fill="none" ${stroke()}/>
     <path d="M30 ${top + 22} L30 ${top + 92}" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
     <path d="M30 ${top + 104} L30 ${top + 118}" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
     <!-- nắp inox -->
     <rect x="24" y="22" width="92" height="28" rx="10" fill="#E3E0DC" ${stroke()}/>
     <rect x="58" y="8" width="24" height="18" rx="7" fill="#CFCAC4" ${stroke()}/>
     <path d="M30 30 h40" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
     <!-- nhãn gỗ trống (chữ tên trà do game viết lên) -->
     <rect x="26" y="112" width="88" height="56" rx="10" fill="${PALETTE.cream}" ${stroke()}/>
     ${a.locked ? '<rect x="16" y="46" width="108" height="190" rx="22" fill="#FFFFFF" opacity="0.35"/>' : ''}`,
  );
}
