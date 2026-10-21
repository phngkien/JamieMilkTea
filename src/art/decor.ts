// Đồ trang trí mua được (config/upgrades): chậu cây lớn, tranh mèo uống trà, bình hoa.
// Thiết kế riêng của Jamie's Milk Tea.
import { PALETTE } from '../config/palette';
import { shade, stroke, svg } from './svg';

/** Chậu cây lá to đứng trên sàn. Khung 120×150. */
export function bigPlantSvg(): string {
  const leaf = (cx: number, cy: number, rot: number, color: string) =>
    `<g transform="rotate(${rot} ${cx} ${cy})">
      <ellipse cx="${cx}" cy="${cy}" rx="15" ry="30" fill="${color}" ${stroke(2.5)}/>
      <path d="M${cx} ${cy - 24} V${cy + 26}" stroke="${shade(color, -0.25)}" stroke-width="2.5" stroke-linecap="round"/>
    </g>`;
  return svg(
    120,
    150,
    `<ellipse cx="60" cy="144" rx="38" ry="5" fill="${PALETTE.outline}" opacity="0.15"/>
     ${leaf(36, 58, -38, '#8FC27A')}
     ${leaf(84, 58, 38, '#8FC27A')}
     ${leaf(46, 38, -12, PALETTE.matcha)}
     ${leaf(74, 40, 16, PALETTE.matcha)}
     ${leaf(60, 30, 0, '#9ACB80')}
     <path d="M30 92 h60 l-8 50 h-44 Z" fill="${PALETTE.woodLight}" ${stroke()}/>
     <rect x="25" y="86" width="70" height="14" rx="6" fill="${PALETTE.woodDark}" ${stroke()}/>
     <path d="M38 104 v30" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.4"/>`,
  );
}

/** Tranh treo tường: chú mèo cam ôm ly trà sữa, khung gỗ. Khung 150×120. */
export function teaCatPaintingSvg(): string {
  return svg(
    150,
    120,
    `<path d="M75 4 L52 22 M75 4 L98 22" stroke="${PALETTE.outline}" stroke-width="2.5" stroke-linecap="round"/>
     <circle cx="75" cy="4" r="3" fill="${PALETTE.gold}" ${stroke(2)}/>
     <rect x="8" y="20" width="134" height="94" rx="8" fill="${PALETTE.woodDark}" ${stroke()}/>
     <rect x="18" y="30" width="114" height="74" rx="4" fill="${PALETTE.mint}" ${stroke(2.5)}/>
     <circle cx="112" cy="46" r="9" fill="#FFF3C9" ${stroke(2)}/>
     <path d="M18 88 Q60 76 132 90 V104 H18 Z" fill="${PALETTE.matcha}" ${stroke(2)}/>
     <!-- mèo -->
     <path d="M50 52 L46 38 L58 46 Z" fill="#F6A96B" ${stroke(2.5)}/>
     <path d="M80 52 L84 38 L72 46 Z" fill="#F6A96B" ${stroke(2.5)}/>
     <ellipse cx="65" cy="78" rx="24" ry="18" fill="#F6A96B" ${stroke(2.5)}/>
     <ellipse cx="65" cy="58" rx="19" ry="15" fill="#F6A96B" ${stroke(2.5)}/>
     <path d="M57 56 q2 -3 4 0 M69 56 q2 -3 4 0" fill="none" ${stroke(2)}/>
     <path d="M63 62 q2 2 4 0" fill="none" ${stroke(2)}/>
     <ellipse cx="54" cy="63" rx="3.5" ry="2" fill="${PALETTE.pink}" opacity="0.7"/>
     <ellipse cx="76" cy="63" rx="3.5" ry="2" fill="${PALETTE.pink}" opacity="0.7"/>
     <!-- ly trà sữa trong tay mèo -->
     <path d="M84 66 h16 l-2 24 h-12 Z" fill="#E9C9A0" ${stroke(2.5)}/>
     <circle cx="88" cy="86" r="2" fill="#4A3328"/><circle cx="94" cy="85" r="2" fill="#4A3328"/>
     <path d="M83 66 h18" ${stroke(3)}/>
     <path d="M95 66 L99 54" stroke="${PALETTE.pink}" stroke-width="3" stroke-linecap="round"/>
     <ellipse cx="82" cy="78" rx="6" ry="5" fill="#F6A96B" ${stroke(2)}/>
     <path d="M26 36 h20" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`,
  );
}

/** Bình hoa nhỏ trên quầy. Khung 90×130. */
export function flowerVaseSvg(): string {
  const flower = (x: number, y: number, color: string) => {
    let petals = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      petals += `<circle cx="${(x + Math.cos(a) * 7).toFixed(1)}" cy="${(y + Math.sin(a) * 7).toFixed(1)}" r="6" fill="${color}" ${stroke(2)}/>`;
    }
    return `${petals}<circle cx="${x}" cy="${y}" r="4.5" fill="${PALETTE.gold}" ${stroke(2)}/>`;
  };
  return svg(
    90,
    130,
    `<ellipse cx="45" cy="125" rx="26" ry="4" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="M45 76 L28 32 M45 76 L45 22 M45 76 L64 34 M45 76 L20 52 M45 76 L70 54" stroke="#7FB46A" stroke-width="3" stroke-linecap="round"/>
     <ellipse cx="30" cy="58" rx="8" ry="4" transform="rotate(-30 30 58)" fill="${PALETTE.matcha}" ${stroke(2)}/>
     <ellipse cx="62" cy="60" rx="8" ry="4" transform="rotate(30 62 60)" fill="${PALETTE.matcha}" ${stroke(2)}/>
     ${flower(28, 30, PALETTE.pink)}
     ${flower(45, 20, '#FFFFFF')}
     ${flower(64, 32, PALETTE.pinkLight)}
     ${flower(20, 50, '#F6A96B')}
     ${flower(70, 52, '#C8B6E8')}
     <path d="M30 76 h30 q6 22 -2 46 h-26 q-8 -24 -2 -46 Z" fill="#A9CBEA" fill-opacity="0.85" ${stroke()}/>
     <rect x="27" y="72" width="36" height="9" rx="4" fill="#BFD8EE" ${stroke(2.5)}/>
     <path d="M36 86 q-3 14 0 28" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>`,
  );
}

export const DECOR_ART: Record<string, { svg: () => string; w: number; h: number }> = {
  plant: { svg: bigPlantSvg, w: 120, h: 150 },
  painting: { svg: teaCatPaintingSvg, w: 150, h: 120 },
  flowers: { svg: flowerVaseSvg, w: 90, h: 130 },
};
