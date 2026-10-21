// Ảnh nền toàn tiệm (phần đứng yên), dựng theo bố cục dọc hoặc ngang.
// Game cắt ảnh này thành nhiều mảnh để làm texture.
import { PALETTE } from '../config/palette';
import type { Rect, ShopLayout } from '../layout';
import { awningSvg, counterSvg, priceBoardSvg, stringLightsSvg } from './scenery';
import { foamTubSvg, plantSvg, syrupBottleSvg } from './props';
import { place, shade, stroke, svg } from './svg';

/** Tường kem có chấm bi nhỏ, phần dưới ốp gỗ. */
function wall(r: Rect, wainscot: number): string {
  let dots = '';
  const wy = r.y + r.h * (1 - wainscot);
  for (let y = r.y + 24, row = 0; y < wy - 10; y += 46, row++) {
    for (let x = r.x + (row % 2 ? 40 : 18); x < r.x + r.w; x += 44) dots += `<circle cx="${x}" cy="${y}" r="3" fill="${PALETTE.beige}"/>`;
  }
  let panels = '';
  if (wainscot > 0) {
    for (let x = r.x + 16; x + 100 < r.x + r.w; x += 124) {
      panels += `<rect x="${x}" y="${wy + 22}" width="100" height="${Math.max(10, r.y + r.h - wy - 40)}" rx="10" fill="none" ${stroke(2.5, shade(PALETTE.woodLight, -0.15))}/>`;
    }
  }
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${PALETTE.cream}"/>${dots}
    ${wainscot > 0 ? `<rect x="${r.x}" y="${wy}" width="${r.w}" height="${r.y + r.h - wy}" fill="${PALETTE.woodLight}"/>${panels}
    <rect x="${r.x}" y="${wy - 7}" width="${r.w}" height="14" rx="4" fill="${PALETTE.woodDark}" ${stroke()}/>` : ''}`;
}

/** Mặt bàn pha chế: gạch men kem kẻ ô. */
function tiles(r: Rect): string {
  let lines = '';
  const size = 90;
  for (let x = r.x + size; x < r.x + r.w; x += size) lines += `<path d="M${x} ${r.y} V${r.y + r.h}" stroke="#EBDCC9" stroke-width="3"/>`;
  for (let y = r.y + size; y < r.y + r.h; y += size) lines += `<path d="M${r.x} ${y} H${r.x + r.w}" stroke="#EBDCC9" stroke-width="3"/>`;
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#F7EADB"/>${lines}`;
}

/** Thớt gỗ lớn để đặt ly. */
function board(r: Rect): string {
  let grain = '';
  for (let i = 1; i < 6; i++) {
    const y = r.y + (r.h * i) / 6;
    grain += `<path d="M${r.x + 30} ${y} q${r.w * 0.25} 10 ${r.w * 0.5} 0 t${r.w * 0.38} 4" fill="none" stroke="${shade(PALETTE.woodLight, -0.15)}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return `<rect x="${r.x + 6}" y="${r.y + 12}" width="${r.w}" height="${r.h}" rx="34" fill="${shade(PALETTE.woodDark, -0.1)}" opacity="0.35"/>
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="34" fill="${PALETTE.woodLight}" ${stroke()}/>
    ${grain}
    <circle cx="${r.x + r.w - 40}" cy="${r.y + 40}" r="14" fill="${shade(PALETTE.woodLight, -0.25)}" ${stroke(2.5)}/>
    <path d="M${r.x + 26} ${r.y + 22} h${r.w * 0.3}" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.45"/>`;
}

/** Khung kệ inox cho lưới topping. */
function shelf(r: Rect): string {
  let rivets = '';
  for (const [x, y] of [
    [r.x + 14, r.y + 14],
    [r.x + r.w - 14, r.y + 14],
    [r.x + 14, r.y + r.h - 14],
    [r.x + r.w - 14, r.y + r.h - 14],
  ]) {
    rivets += `<circle cx="${x}" cy="${y}" r="5" fill="#D9D6D2" ${stroke(2)}/>`;
  }
  return `<rect x="${r.x + 4}" y="${r.y + 10}" width="${r.w}" height="${r.h}" rx="24" fill="${PALETTE.outline}" opacity="0.18"/>
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="24" fill="#A9A39D" ${stroke()}/>
    <rect x="${r.x + 8}" y="${r.y + 8}" width="${r.w - 16}" height="${r.h - 16}" rx="18" fill="#B9B4AE"/>${rivets}`;
}

/** Kệ quầy trà (mặt gỗ dưới hàng bình). */
function teaShelf(r: Rect): string {
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h * 0.45}" rx="10" fill="${PALETTE.woodLight}" ${stroke()}/>
    <rect x="${r.x + 6}" y="${r.y + r.h * 0.45}" width="${r.w - 12}" height="${r.h * 0.55}" fill="${PALETTE.woodDark}" ${stroke()}/>
    <path d="M${r.x + 16} ${r.y + 8} H${r.x + r.w - 16}" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>`;
}

/** Góc trang trí: kệ treo tường với chậu cây và bảng giá nhỏ. */
function decor(r: Rect): string {
  const plantW = r.h * 0.82;
  const boardW = Math.min(r.w - plantW * 2 - 20, r.h * 1.5);
  return `<rect x="${r.x}" y="${r.y + r.h - 14}" width="${r.w}" height="14" rx="5" fill="${PALETTE.woodDark}" ${stroke()}/>
    ${place(plantSvg(0), r.x + 6, r.y + r.h - 14 - plantW * 1.2, plantW, plantW * 1.2)}
    ${place(priceBoardSvg(200, 150), r.x + r.w / 2 - boardW / 2, r.y - 4, boardW, boardW * 0.75)}
    ${place(plantSvg(1), r.x + r.w - plantW - 6, r.y + r.h - 14 - plantW * 1.2, plantW, plantW * 1.2)}`;
}

/** Hàng foam + chai siro (sắp mở) — vẽ mờ. */
function comingSoon(r: Rect): string {
  const tubColors = ['#FFF3C9', PALETTE.matcha, '#FFFFFF', '#B79AD6'];
  const bottleColors = ['#F27C95', '#FFB547', '#A7D08C', '#9E3B3B', '#B98B4E', '#6FA8DC'];
  const tubW = Math.min(r.h * 0.95, r.w / 9);
  let items = '';
  tubColors.forEach((c, i) => {
    items += place(foamTubSvg(c), r.x + 10 + i * (tubW + 8), r.y + r.h - tubW * 1.07, tubW, tubW * 1.07);
  });
  const bw = Math.min(r.h * 0.42, r.w / 16);
  const start = r.x + 10 + 4 * (tubW + 8) + 10;
  bottleColors.forEach((c, i) => {
    items += place(syrupBottleSvg(c), start + i * (bw + 8), r.y + r.h - bw * 2.43, bw, bw * 2.43);
  });
  return `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="18" fill="${PALETTE.beige}" ${stroke(2.5)}/>
    <g opacity="0.45">${items}</g>`;
}

export function shopBackgroundSvg(L: ShopLayout): string {
  const W = L.viewWidth;
  const H = L.worldHeight;
  const z = L.zones;
  const awningH = L.awning.h;
  const parts = [
    `<rect width="${W}" height="${H}" fill="${PALETTE.cream}"/>`,
    wall(z.customer, 0.45),
    wall(z.tea, 0.3),
    tiles(z.brew),
    wall(z.topping, 0),
    // Viền gỗ ngăn các vùng
    ...[z.tea, z.brew, z.topping].map(
      (r) => `<rect x="${r.x}" y="${r.y - 5}" width="${r.w}" height="10" fill="${PALETTE.woodDark}" ${stroke(2)}/>`,
    ),
    L.kind === 'landscape'
      ? [z.brew, z.topping].map((r) => `<rect x="${r.x - 5}" y="${r.y}" width="10" height="${r.h}" fill="${PALETTE.woodDark}" ${stroke(2)}/>`).join('')
      : '',
    place(stringLightsSvg(W, 70, Math.round(W / 85)), 0, L.awning.y + awningH * 0.78, W, 70),
    place(awningSvg(W, awningH, L.kind === 'portrait' ? 90 : 80), 0, L.awning.y, W, awningH + 10),
    decor(L.decor),
    place(counterSvg(L.counterStrip.w, 100), L.counterStrip.x, L.counterStrip.y, L.counterStrip.w, L.counterStrip.h + 10, true),
    teaShelf(L.teaShelf),
    board(L.board),
    shelf(L.toppingShelf),
    comingSoon(L.comingSoon),
    place(counterSvg(W, 160), L.floor.x, L.floor.y, L.floor.w, Math.max(L.floor.h, 40), true),
  ];
  return svg(W, H, parts.join(''));
}
