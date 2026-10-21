// Đồ vật trong tiệm: chồng cốc, máy ép nắp, thùng rác, thùng đá, nước đường, nút Giao, bảng tên gỗ...
// Chữ (tên món, nhãn) do game viết đè lên bằng font Baloo 2 / Nunito, không nằm trong SVG.
import { PALETTE } from '../config/palette';
import { seeded, shade, stroke, svg } from './svg';

/** Chồng cốc nhựa úp lồng vào nhau. Khung 140×300. */
export function cupStackSvg(size: 'M' | 'L'): string {
  const w = size === 'L' ? 110 : 96;
  const x0 = 70 - w / 2;
  let rims = '';
  for (let y = 236; y >= 90; y -= 13) {
    rims += `<path d="M${x0 + 2} ${y} h${w - 4} l-4 12 h-${w - 12} Z" fill="#FFFFFF" fill-opacity="0.92" ${stroke(2.5)}/>`;
  }
  return svg(
    140,
    300,
    `<ellipse cx="70" cy="258" rx="${w / 2 + 6}" ry="7" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="M${x0} 40 h${w} l-10 210 h-${w - 20} Z" fill="#FFFFFF" fill-opacity="0.75" ${stroke()}/>
     ${rims}
     <path d="M${x0 - 3} 40 h${w + 6}" ${stroke(4)}/>
     <path d="M${x0 + 14} 54 L${x0 + 22} 230" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.9"/>
     <circle cx="70" cy="80" r="26" fill="${PALETTE.cream}" ${stroke()}/>`,
  );
}

/** Máy ép nắp: thân kem, cuộn màng hồng, khoang đặt ly, đèn xanh. Khung 260×300. */
export function sealerSvg(): string {
  return svg(
    260,
    300,
    `<ellipse cx="130" cy="290" rx="110" ry="8" fill="${PALETTE.outline}" opacity="0.15"/>
     <rect x="26" y="40" width="208" height="236" rx="28" fill="#EFE4D8" ${stroke()}/>
     <rect x="26" y="40" width="208" height="56" rx="28" fill="${PALETTE.beige}" ${stroke()}/>
     <!-- cuộn màng nắp -->
     <rect x="62" y="8" width="136" height="44" rx="22" fill="${PALETTE.pinkLight}" ${stroke()}/>
     <path d="M80 30 h100" stroke="${PALETTE.pink}" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"/>
     <circle cx="62" cy="30" r="12" fill="#D9D6D2" ${stroke()}/><circle cx="198" cy="30" r="12" fill="#D9D6D2" ${stroke()}/>
     <!-- khoang đặt ly -->
     <rect x="60" y="112" width="140" height="130" rx="16" fill="#8E7B6B" ${stroke()}/>
     <rect x="70" y="122" width="120" height="110" rx="10" fill="#A8968A"/>
     <rect x="64" y="230" width="132" height="14" rx="6" fill="#D9D6D2" ${stroke(2.5)}/>
     <!-- bảng điều khiển -->
     <circle cx="212" cy="70" r="8" fill="${PALETTE.matcha}" ${stroke(2.5)}/>
     <rect x="46" y="60" width="54" height="20" rx="6" fill="#FFFFFF" ${stroke(2.5)}/>
     <path d="M52 70 h42" stroke="${PALETTE.matcha}" stroke-width="4" stroke-linecap="round"/>
     <path d="M40 100 v160" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.6"/>`,
  );
}

/** Bàn ép (phần chuyển động lên xuống của máy ép). Khung 130×30. */
export function sealerPressSvg(): string {
  return svg(130, 30, `<rect x="4" y="4" width="122" height="22" rx="8" fill="#CFC9C2" ${stroke()}/><path d="M14 10 h60" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`);
}

/** Thùng rác inox có bàn đạp. Khung 200×200. */
export function trashSvg(): string {
  let ribs = '';
  for (let x = 72; x <= 128; x += 14) ribs += `<path d="M${x} 74 L${x} 168" stroke="${shade('#C9C4BE', -0.15)}" stroke-width="3" stroke-linecap="round"/>`;
  return svg(
    200,
    200,
    `<ellipse cx="100" cy="186" rx="64" ry="7" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="M52 62 L62 180 Q100 188 138 180 L148 62 Z" fill="#D9D6D2" ${stroke()}/>
     ${ribs}
     <rect x="42" y="44" width="116" height="22" rx="10" fill="#C9C4BE" ${stroke()}/>
     <rect x="86" y="32" width="28" height="14" rx="6" fill="#B9B4AE" ${stroke(2.5)}/>
     <path d="M60 52 h50" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
     <path d="M66 80 L72 160" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.6"/>`,
  );
}

/** Thùng đá viên có muỗng xúc. Khung 220×200. */
export function iceBinSvg(): string {
  const rand = seeded(11);
  let cubes = '';
  for (let i = 0; i < 12; i++) {
    const x = 42 + (i % 6) * 24 + rand() * 6;
    const y = 74 + Math.floor(i / 6) * 22 + rand() * 6;
    cubes += `<rect x="${x}" y="${y}" width="22" height="22" rx="5" transform="rotate(${rand() * 30 - 15} ${x + 11} ${y + 11})" fill="#EAF7FD" ${stroke(2, '#8DBBD3')}/>
      <path d="M${x + 5} ${y + 6} h7" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>`;
  }
  return svg(
    220,
    200,
    `<ellipse cx="110" cy="188" rx="90" ry="7" fill="${PALETTE.outline}" opacity="0.15"/>
     <path d="M22 70 L32 178 Q110 186 188 178 L198 70 Z" fill="#DCE3E8" ${stroke()}/>
     <rect x="14" y="58" width="192" height="24" rx="10" fill="#C9D3DA" ${stroke()}/>
     ${cubes}
     <!-- muỗng xúc -->
     <path d="M150 50 L190 10" ${stroke(12)}/><path d="M150 50 L190 10" stroke="#9A6B45" stroke-width="7" stroke-linecap="round"/>
     <path d="M126 58 Q120 88 148 92 Q170 90 168 62 Z" fill="#E3E0DC" ${stroke()}/>
     <path d="M36 96 L42 166" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7"/>`,
  );
}

/** Hũ nước đường có vòi bơm. Khung 220×200. */
export function syrupSvg(): string {
  return svg(
    220,
    200,
    `<ellipse cx="110" cy="188" rx="80" ry="7" fill="${PALETTE.outline}" opacity="0.15"/>
     <rect x="40" y="70" width="140" height="112" rx="22" fill="#F4FAFB" ${stroke()}/>
     <rect x="46" y="96" width="128" height="80" rx="18" fill="#E7A74A"/>
     <path d="M46 100 q16 -6 32 0 t32 0 t32 0 t32 0 v8 h-128 Z" fill="#F2C47B"/>
     <rect x="40" y="70" width="140" height="112" rx="22" fill="none" ${stroke()}/>
     <path d="M56 86 v70" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
     <!-- vòi bơm -->
     <rect x="88" y="44" width="44" height="30" rx="8" fill="#D9D6D2" ${stroke()}/>
     <rect x="100" y="14" width="20" height="34" rx="6" fill="#CFCAC4" ${stroke()}/>
     <path d="M110 18 h56 v14 h-10" fill="none" ${stroke(8)}/><path d="M110 18 h56 v14 h-10" fill="none" stroke="#E3E0DC" stroke-width="4"/>
     <rect x="84" y="4" width="52" height="16" rx="8" fill="${PALETTE.pink}" ${stroke()}/>
     <!-- giọt đường -->
     <path d="M156 42 Q162 54 156 58 Q150 54 156 42 Z" fill="#E7A74A" ${stroke(2)}/>`,
  );
}

/** Nút kẹo tròn màu hồng (nút Giao). Khung w×h. */
export function candyButtonSvg(w: number, h: number, color: string = PALETTE.pink): string {
  const r = Math.min(h / 2 - 6, 40);
  return svg(
    w,
    h,
    `<rect x="6" y="14" width="${w - 12}" height="${h - 18}" rx="${r}" fill="${shade(color, -0.25)}" ${stroke()}/>
     <rect x="6" y="4" width="${w - 12}" height="${h - 18}" rx="${r}" fill="${color}" ${stroke()}/>
     <path d="M${r} 16 h${w * 0.35}" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.55"/>`,
  );
}

/** Bảng tên gỗ (nhãn khu vực, nhãn đồ vật). Khung w×h. */
export function plaqueSvg(w: number, h: number, color: string = PALETTE.beige): string {
  return svg(
    w,
    h,
    `<rect x="3" y="6" width="${w - 6}" height="${h - 9}" rx="${Math.min(16, h / 3)}" fill="${shade(color, -0.2)}" ${stroke(2.5)}/>
     <rect x="3" y="3" width="${w - 6}" height="${h - 9}" rx="${Math.min(16, h / 3)}" fill="${color}" ${stroke(2.5)}/>
     <circle cx="14" cy="${h / 2 - 2}" r="3" fill="${shade(color, -0.35)}"/><circle cx="${w - 14}" cy="${h / 2 - 2}" r="3" fill="${shade(color, -0.35)}"/>`,
  );
}

/** Hũ foam (kệ foam, sắp mở). Khung 140×150. */
export function foamTubSvg(color: string): string {
  return svg(
    140,
    150,
    `<path d="M14 40 L22 140 Q70 148 118 140 L126 40 Z" fill="#D9D6D2" ${stroke()}/>
     <path d="M22 44 Q36 22 56 34 Q72 14 90 32 Q112 22 118 44 Z" fill="${color}" ${stroke()}/>
     <path d="M94 34 L120 4" ${stroke(8)}/><path d="M94 34 L120 4" stroke="#E3E0DC" stroke-width="4" stroke-linecap="round"/>`,
  );
}

/** Chai siro có vòi bơm (hàng siro, sắp mở). Khung 70×170. */
export function syrupBottleSvg(color: string): string {
  return svg(
    70,
    170,
    `<rect x="12" y="60" width="46" height="104" rx="12" fill="${color}" ${stroke()}/>
     <rect x="18" y="92" width="34" height="34" rx="6" fill="#FFF7EF" ${stroke(2)}/>
     <circle cx="35" cy="109" r="8" fill="${shade(color, -0.15)}"/>
     <path d="M26 60 L26 44 Q35 36 44 44 L44 60" fill="#D9D6D2" ${stroke()}/>
     <rect x="31" y="10" width="8" height="36" fill="#CFCAC4" ${stroke(2)}/>
     <path d="M35 12 h22 v8" fill="none" ${stroke(5)}/>
     <rect x="24" y="4" width="22" height="10" rx="4" fill="#3E3A37" ${stroke(2)}/>
     <path d="M20 70 v80" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>`,
  );
}

/** Chậu cây nhỏ trang trí. Khung 90×110. */
export function plantSvg(variant = 0): string {
  const pot = variant % 2 ? PALETTE.pinkLight : '#F4C9A8';
  const leaves =
    variant % 2
      ? `<ellipse cx="45" cy="36" rx="14" ry="26" fill="${PALETTE.matcha}" ${stroke()}/><ellipse cx="26" cy="50" rx="10" ry="20" transform="rotate(-30 26 50)" fill="#8FC27A" ${stroke()}/><ellipse cx="64" cy="50" rx="10" ry="20" transform="rotate(30 64 50)" fill="#8FC27A" ${stroke()}/>`
      : `<circle cx="45" cy="40" r="26" fill="${PALETTE.matcha}" ${stroke()}/><circle cx="34" cy="36" r="5" fill="#F28CA8" ${stroke(2)}/><circle cx="56" cy="44" r="5" fill="#F5C65B" ${stroke(2)}/><circle cx="48" cy="26" r="5" fill="#FFFFFF" ${stroke(2)}/>`;
  return svg(90, 110, `${leaves}<path d="M20 66 h50 l-6 40 h-38 Z" fill="${pot}" ${stroke()}/><rect x="16" y="62" width="58" height="12" rx="5" fill="${shade(pot, -0.1)}" ${stroke()}/>`);
}

/** Hơi nóng bốc lên (hình động). Khung 60×90. */
export function steamSvg(): string {
  return svg(60, 90, `<path d="M20 86 Q6 66 20 48 Q34 30 20 8" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="0.85"/><path d="M42 80 Q30 64 42 50 Q54 36 42 18" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7"/>`);
}

/** Ngôi sao (sao bật ra khi chấm điểm). Khung 60×60. */
export function starSvg(filled = true): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 12 : 26;
    pts.push(`${30 + Math.cos(a) * r},${32 + Math.sin(a) * r}`);
  }
  return svg(60, 60, `<polygon points="${pts.join(' ')}" fill="${filled ? PALETTE.gold : '#E9E1D8'}" ${stroke(3)}/><circle cx="24" cy="24" r="3" fill="#FFFFFF" opacity="${filled ? 0.8 : 0}"/>`);
}

/** Đồng xu (tiền bay lên HUD). Khung 48×48. */
export function coinSvg(): string {
  return svg(48, 48, `<circle cx="24" cy="24" r="20" fill="${PALETTE.gold}" ${stroke(3)}/><circle cx="24" cy="24" r="13" fill="none" stroke="#E0A82E" stroke-width="3"/><path d="M18 18 q6 -4 10 0" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none"/>`);
}
