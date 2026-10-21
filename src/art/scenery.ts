// Cảnh nền tiệm: mái hiên, tường kem ốp gỗ, cửa sổ có mây và rèm, đèn dây, quầy gỗ.
import { PALETTE } from '../config/palette';
import { shade, stroke, svg, uid } from './svg';

/** Mái hiên sọc hồng – kem, mép lượn sóng. */
export function awningSvg(width: number, height: number, stripe = 90): string {
  const scallopY = height * 0.72;
  let stripes = '';
  let scallops = '';
  for (let x = 0, i = 0; x < width; x += stripe, i++) {
    const c = i % 2 === 0 ? PALETTE.pink : '#FFF7EF';
    stripes += `<rect x="${x}" y="0" width="${stripe}" height="${scallopY}" fill="${c}"/>`;
    scallops += `<path d="M${x} ${scallopY} Q${x + stripe / 2} ${height + 6} ${x + stripe} ${scallopY} Z" fill="${c}" ${stroke()}/>`;
  }
  return svg(
    width,
    height + 10,
    `${stripes}
     <rect x="0" y="0" width="${width}" height="${scallopY}" fill="none" ${stroke()}/>
     <rect x="0" y="0" width="${width}" height="14" fill="${shade(PALETTE.pink, -0.15)}" ${stroke()}/>
     ${scallops}
     <path d="M0 ${scallopY - 8} H${width}" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>`,
  );
}

/** Đám mây nhỏ (dùng trong cửa sổ, có thể làm hình động trôi). */
export function cloudSvg(w = 120, h = 60): string {
  return svg(
    w,
    h,
    `<path d="M14 ${h - 10} Q4 ${h - 10} 6 ${h - 22} Q8 ${h - 34} 22 ${h - 32} Q26 ${h - 52} 48 ${h - 48} Q60 ${h - 60} 78 ${h - 48} Q100 ${h - 52} 102 ${h - 32} Q116 ${h - 30} 112 ${h - 16} Q110 ${h - 10} 100 ${h - 10} Z" fill="#FFFFFF" stroke="#D7E6F0" stroke-width="3"/>`,
  );
}

/** Cửa sổ có trời xanh, mây, rèm hai bên. */
export function windowSvg(w: number, h: number): string {
  const sky = uid('sky');
  return svg(
    w,
    h,
    `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE3F5"/><stop offset="1" stop-color="#E6F5FB"/></linearGradient></defs>
     <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="16" fill="url(#${sky})" ${stroke()}/>
     <path d="M${w / 2} 8 V${h - 8} M8 ${h / 2} H${w - 8}" ${stroke(6, PALETTE.woodLight)}/>
     <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="16" fill="none" ${stroke(8, PALETTE.woodLight)}/>
     <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="18" fill="none" ${stroke()}/>
     <path d="M2 2 Q${w * 0.28} ${h * 0.35} ${w * 0.12} ${h - 4} L2 ${h - 4} Z" fill="${PALETTE.pinkLight}" ${stroke()}/>
     <path d="M${w - 2} 2 Q${w * 0.72} ${h * 0.35} ${w * 0.88} ${h - 4} L${w - 2} ${h - 4} Z" fill="${PALETTE.pinkLight}" ${stroke()}/>
     <rect x="0" y="${h - 14}" width="${w}" height="14" rx="6" fill="${PALETTE.woodDark}" ${stroke()}/>`,
  );
}

/** Dây đèn nhỏ lấp lánh. */
export function stringLightsSvg(w: number, h = 60, count = 9): string {
  let bulbs = '';
  const colors = [PALETTE.gold, PALETTE.pink, PALETTE.mint, '#FFF4C7'];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = t * w;
    const y = 10 + Math.sin(t * Math.PI) * (h - 30);
    bulbs += `<path d="M${x} ${y} v6" ${stroke(2)}/><ellipse cx="${x}" cy="${y + 14}" rx="7" ry="10" fill="${colors[i % colors.length]}" ${stroke(2)}/>
      <circle cx="${x - 2}" cy="${y + 10}" r="2.2" fill="#FFFFFF" opacity="0.9"/>`;
  }
  return svg(w, h, `<path d="M0 10 Q${w / 2} ${h * 2 - 50} ${w} 10" fill="none" ${stroke(2.5)}/>${bulbs}`);
}

/** Tường kem có ốp gỗ chân tường. */
export function wallSvg(w: number, h: number, wainscot = 0.42): string {
  const wy = h * (1 - wainscot);
  let panels = '';
  const pw = 120;
  for (let x = 14; x + pw - 20 < w; x += pw) {
    panels += `<rect x="${x}" y="${wy + 24}" width="${pw - 24}" height="${h - wy - 44}" rx="8" fill="none" ${stroke(2.5, shade(PALETTE.woodLight, -0.18))}/>`;
  }
  // Họa tiết chấm nhỏ trên tường
  let dots = '';
  for (let y = 26; y < wy - 10; y += 46) {
    for (let x = (y / 46) % 2 ? 40 : 18; x < w; x += 44) dots += `<circle cx="${x}" cy="${y}" r="3" fill="${PALETTE.beige}"/>`;
  }
  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${PALETTE.cream}"/>${dots}
     <rect x="0" y="${wy}" width="${w}" height="${h - wy}" fill="${PALETTE.woodLight}"/>
     ${panels}
     <rect x="0" y="${wy - 8}" width="${w}" height="16" rx="4" fill="${PALETTE.woodDark}" ${stroke()}/>`,
  );
}

/** Mặt quầy gỗ (nhìn nghiêng). */
export function counterSvg(w: number, h: number): string {
  let grain = '';
  for (let x = 60; x < w; x += 140) grain += `<path d="M${x} ${h * 0.45} q20 8 40 0" fill="none" ${stroke(2, shade(PALETTE.woodDark, -0.1))} opacity="0.5"/>`;
  return svg(
    w,
    h,
    `<rect x="0" y="0" width="${w}" height="${h * 0.3}" rx="8" fill="${PALETTE.woodLight}" ${stroke()}/>
     <path d="M10 ${h * 0.1} H${w - 10}" stroke="#FFFFFF" stroke-width="3" opacity="0.45"/>
     <rect x="0" y="${h * 0.3}" width="${w}" height="${h * 0.7}" fill="${PALETTE.woodDark}" ${stroke()}/>
     ${grain}`,
  );
}

/** Bảng giá nhỏ treo tường. */
export function priceBoardSvg(w = 200, h = 150, lines: string[] = []): string {
  const rows = lines
    .slice(0, 4)
    .map((l, i) => `<text x="22" y="${58 + i * 24}" font-family="Nunito, sans-serif" font-weight="700" font-size="17" fill="#FFF7EF">${l}</text>`)
    .join('');
  return svg(
    w,
    h,
    `<path d="M${w / 2} 2 L30 26 M${w / 2} 2 L${w - 30} 26" ${stroke(2.5)} fill="none"/>
     <rect x="6" y="22" width="${w - 12}" height="${h - 28}" rx="12" fill="${PALETTE.woodDark}" ${stroke()}/>
     <rect x="16" y="32" width="${w - 32}" height="${h - 48}" rx="8" fill="#56463C" ${stroke(2.5)}/>
     ${rows}`,
  );
}
