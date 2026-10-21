// Nhân vật (khách và nhân viên): tranh phẳng kiểu anime đời thường, đầu hơi to.
// Mỗi nhân vật ghép từ nhiều bộ phận (tóc sau, thân, đầu, mặt, tóc trước, phụ kiện) để làm hình động.
// Toàn bộ là thiết kế riêng của Jamie's Milk Tea.
import { INK, shade, stroke, svg } from './svg';

export type Expression = 'normal' | 'happy' | 'sad';
export type HairStyle = 'bob' | 'short' | 'ponytail' | 'bun' | 'long' | 'curly' | 'spiky' | 'braids';
export type Outfit = 'tee' | 'hoodie' | 'uniform' | 'aodai' | 'overalls' | 'shirt' | 'sweater' | 'apron';
export type Hat = 'none' | 'cap' | 'beanie' | 'bucket';

export interface CharacterDef {
  id: string;
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: Outfit;
  outfitColor: string;
  /** Màu phụ: viền áo, kẹp tóc, dây mũ... */
  accent: string;
  eyes: string;
  glasses?: boolean;
  hat?: Hat;
  freckles?: boolean;
}

/** Khung vẽ nhân vật (bán thân): rộng 200, cao 260. Đầu ở trên, vai ở dưới. */
export const CHAR_W = 200;
export const CHAR_H = 260;
const HX = 100; // tâm đầu
const HY = 104;
const HRX = 58; // bán kính đầu
const HRY = 54;

// ───────────── Tóc sau (nằm sau đầu) ─────────────
function hairBack(d: CharacterDef): string {
  const c = d.hair;
  const s = stroke();
  switch (d.hairStyle) {
    case 'bob':
      return `<path d="M40 100 Q38 40 100 38 Q162 40 160 100 L162 150 Q150 160 136 152 L64 152 Q50 160 38 150 Z" fill="${c}" ${s}/>`;
    case 'long':
    case 'braids':
      return `<path d="M42 96 Q40 38 100 36 Q160 38 158 96 L164 196 Q140 206 128 190 L72 190 Q60 206 36 196 Z" fill="${c}" ${s}/>`;
    case 'ponytail':
      return `<path d="M150 70 Q190 80 182 140 Q178 170 160 176 Q170 140 150 110 Z" fill="${c}" ${s}/>
        <path d="M44 100 Q42 42 100 40 Q158 42 156 100 Z" fill="${c}" ${s}/>`;
    case 'bun':
      return `<circle cx="100" cy="40" r="26" fill="${c}" ${s}/><path d="M44 100 Q42 44 100 42 Q158 44 156 100 Z" fill="${c}" ${s}/>`;
    case 'curly':
      return `<path d="M36 112 Q22 90 38 70 Q34 40 66 34 Q84 14 108 26 Q140 18 156 44 Q180 58 168 86 Q182 110 162 128 L38 128 Z" fill="${c}" ${s}/>`;
    default:
      return '';
  }
}

// ───────────── Thân + trang phục ─────────────
function body(d: CharacterDef): string {
  const c = d.outfitColor;
  const dark = shade(c, -0.15);
  const s = stroke();
  const shoulders = `M30 262 Q30 196 70 182 Q100 176 130 182 Q170 196 170 262 Z`;
  const neck = `<path d="M88 150 L88 182 Q100 190 112 182 L112 150 Z" fill="${shade(d.skin, -0.08)}" ${s}/>`;
  let outfit = `<path d="${shoulders}" fill="${c}" ${s}/>`;
  switch (d.outfit) {
    case 'hoodie':
      outfit += `<path d="M62 186 Q100 214 138 186 Q130 172 100 172 Q70 172 62 186 Z" fill="${dark}" ${s}/>
        <path d="M90 200 L88 232 M110 200 L112 232" ${stroke(3, d.accent)} fill="none"/>
        <circle cx="88" cy="234" r="4" fill="${d.accent}" ${stroke(2)}/><circle cx="112" cy="234" r="4" fill="${d.accent}" ${stroke(2)}/>
        <path d="M70 244 Q100 236 130 244 L130 262 L70 262 Z" fill="${dark}" ${stroke(2.5)}/>`;
      break;
    case 'uniform':
      // Đồng phục học sinh: áo trắng cổ thủy thủ, nơ
      outfit += `<path d="M70 182 L100 222 L130 182 L150 196 L126 206 L100 236 L74 206 L50 196 Z" fill="${d.accent}" ${s}/>
        <path d="M88 220 L100 232 L112 220 L106 246 L100 238 L94 246 Z" fill="${shade(d.accent, 0.35)}" ${stroke(2.5)}/>`;
      break;
    case 'aodai':
      // Áo dài: cổ đứng, hàng khuy chéo, hoa văn nhỏ
      outfit += `<path d="M84 180 L84 194 Q100 200 116 194 L116 180" fill="${dark}" ${s}/>
        <path d="M116 196 Q132 210 128 240" fill="none" ${stroke(2.5)}/>
        <circle cx="122" cy="204" r="2.5" fill="${d.accent}"/><circle cx="127" cy="216" r="2.5" fill="${d.accent}"/>
        <path d="M60 230 q6 -8 12 0 q-6 8 -12 0 Z M146 222 q5 -7 10 0 q-5 7 -10 0 Z" fill="${d.accent}" ${stroke(1.5)}/>`;
      break;
    case 'overalls':
      outfit += `<path d="M66 214 L134 214 L138 262 L62 262 Z" fill="${d.accent}" ${s}/>
        <path d="M70 186 L74 216 M130 186 L126 216" ${stroke(6, d.accent)}/>
        <circle cx="74" cy="214" r="4" fill="#F5C65B" ${stroke(2)}/><circle cx="126" cy="214" r="4" fill="#F5C65B" ${stroke(2)}/>
        <rect x="88" y="226" width="24" height="16" rx="4" fill="${shade(d.accent, -0.12)}" ${stroke(2)}/>`;
      break;
    case 'shirt':
      outfit += `<path d="M86 180 L100 200 L114 180 L122 192 L100 206 L78 192 Z" fill="#FFFFFF" ${s}/>
        <path d="M100 206 L100 262" ${stroke(2.5)}/><circle cx="100" cy="222" r="2.5" fill="${INK}"/><circle cx="100" cy="242" r="2.5" fill="${INK}"/>
        <path d="M128 214 h16 v14 h-16 Z" fill="${dark}" ${stroke(2)}/>`;
      break;
    case 'sweater':
      outfit += `<path d="M78 182 Q100 196 122 182" fill="none" ${stroke(6, dark)}/>
        <path d="M44 230 Q100 222 156 230" fill="none" ${stroke(4, d.accent)}/>
        <path d="M48 244 Q100 236 152 244" fill="none" ${stroke(4, d.accent)}/>`;
      break;
    case 'apron':
      // Tạp dề nhân viên: màu theo outfit (accent)
      outfit += `<path d="M66 196 Q100 206 134 196 L140 262 L60 262 Z" fill="${d.accent}" ${s}/>
        <path d="M74 186 L70 200 M126 186 L130 200" ${stroke(5, d.accent)}/>
        <path d="M84 226 h32 v18 h-32 Z" fill="${shade(d.accent, -0.1)}" ${stroke(2)}/>
        <path d="M94 212 q6 -8 12 0 q-6 8 -12 0 Z" fill="#FFFFFF" ${stroke(1.5)}/>`;
      break;
    default:
      // Áo thun: cổ tròn + hình in nhỏ
      outfit += `<path d="M82 182 Q100 196 118 182" fill="none" ${stroke(4, dark)}/>
        <circle cx="118" cy="226" r="9" fill="${d.accent}" ${stroke(2)}/>`;
  }
  return outfit + neck;
}

// ───────────── Đầu (mặt, tai) ─────────────
function head(d: CharacterDef): string {
  const s = stroke();
  return `<ellipse cx="${HX - HRX + 2}" cy="${HY + 8}" rx="9" ry="12" fill="${d.skin}" ${s}/>
    <ellipse cx="${HX + HRX - 2}" cy="${HY + 8}" rx="9" ry="12" fill="${d.skin}" ${s}/>
    <ellipse cx="${HX}" cy="${HY}" rx="${HRX}" ry="${HRY}" fill="${d.skin}" ${s}/>`;
}

// ───────────── Tóc trước (mái) ─────────────
function hairFront(d: CharacterDef): string {
  const c = d.hair;
  const hl = shade(c, 0.25);
  const s = stroke();
  switch (d.hairStyle) {
    case 'bob':
      return `<path d="M42 104 Q40 46 100 44 Q160 46 158 104 Q150 84 132 80 Q126 92 112 84 Q104 96 92 84 Q80 94 70 82 Q52 86 42 104 Z" fill="${c}" ${s}/>
        <path d="M70 58 Q90 50 110 54" fill="none" ${stroke(4, hl)}/>`;
    case 'short':
      return `<path d="M44 100 Q38 44 100 42 Q164 44 156 100 Q150 76 128 72 Q116 82 100 72 Q84 82 70 72 Q50 78 44 100 Z" fill="${c}" ${s}/>
        <path d="M96 44 Q104 30 116 34 Q108 38 108 46" fill="${c}" ${s}/>`;
    case 'spiky':
      return `<path d="M42 102 L36 70 L56 74 L52 46 L76 58 L84 32 L100 54 L118 30 L124 58 L148 46 L144 74 L166 70 L158 102 Q150 80 128 78 Q100 88 72 78 Q50 82 42 102 Z" fill="${c}" ${s}/>`;
    case 'ponytail':
    case 'bun':
      return `<path d="M44 104 Q42 48 100 46 Q158 48 156 104 Q146 76 118 74 Q104 86 86 76 Q56 76 44 104 Z" fill="${c}" ${s}/>
        <path d="M66 62 Q86 54 104 58" fill="none" ${stroke(4, hl)}/>`;
    case 'long':
    case 'braids':
      // Mái chia ngôi giữa
      return `<path d="M42 110 Q40 46 100 44 Q160 46 158 110 Q150 70 104 62 Q100 76 96 62 Q52 70 42 110 Z" fill="${c}" ${s}/>
        ${d.hairStyle === 'braids' ? braids(d) : ''}`;
    case 'curly':
      return `<path d="M46 98 Q44 82 58 78 Q60 62 78 66 Q86 52 102 62 Q116 52 126 66 Q144 62 144 80 Q158 84 154 100 Q140 86 124 88 Q112 80 100 88 Q86 80 74 88 Q58 84 46 98 Z" fill="${c}" ${s}/>`;
  }
}

function braids(d: CharacterDef): string {
  const c = d.hair;
  const piece = (x: number) =>
    [0, 1, 2, 3].map((i) => `<ellipse cx="${x}" cy="${168 + i * 16}" rx="10" ry="9" fill="${c}" ${stroke(2.5)}/>`).join('') +
    `<circle cx="${x}" cy="${168 + 4 * 16 - 4}" r="5" fill="${d.accent}" ${stroke(2)}/>`;
  return piece(46) + piece(154);
}

// ───────────── Mặt theo biểu cảm ─────────────
function eyes(d: CharacterDef, expression: Expression, closed = false): string {
  const ey = HY + 10;
  const lx = HX - 23;
  const rx = HX + 23;
  if (closed || expression === 'happy') {
    // Mắt cười hình vòng cung
    const arc = (x: number) => `<path d="M${x - 9} ${ey + 2} Q${x} ${ey - 9} ${x + 9} ${ey + 2}" fill="none" ${stroke(3.5, d.eyes)}/>`;
    const line = (x: number) => `<path d="M${x - 9} ${ey + 1} Q${x} ${ey + 5} ${x + 9} ${ey + 1}" fill="none" ${stroke(3.5, d.eyes)}/>`;
    return closed ? line(lx) + line(rx) : arc(lx) + arc(rx);
  }
  const eye = (x: number) =>
    `<ellipse cx="${x}" cy="${ey}" rx="7.5" ry="10" fill="${d.eyes}"/>
     <circle cx="${x - 2.5}" cy="${ey - 4}" r="3" fill="#FFFFFF"/>
     <circle cx="${x + 2.5}" cy="${ey + 4}" r="1.4" fill="#FFFFFF"/>`;
  let brows = '';
  if (expression === 'sad') {
    // Lông mày buồn: đầu phía trong nhướng lên
    brows = `<path d="M${lx - 10} ${ey - 15} L${lx + 8} ${ey - 22}" ${stroke(3, shade(d.hair, -0.1))}/>
             <path d="M${rx + 10} ${ey - 15} L${rx - 8} ${ey - 22}" ${stroke(3, shade(d.hair, -0.1))}/>`;
  }
  return brows + eye(lx) + eye(rx);
}

function mouth(expression: Expression): string {
  const my = HY + 30;
  switch (expression) {
    case 'happy':
      return `<path d="M${HX - 10} ${my - 2} Q${HX} ${my + 14} ${HX + 10} ${my - 2} Z" fill="#C9605A" ${stroke(2.5)}/>
        <path d="M${HX - 5} ${my + 6} Q${HX} ${my + 3} ${HX + 5} ${my + 6}" fill="#F28CA8"/>`;
    case 'sad':
      return `<path d="M${HX - 8} ${my + 5} Q${HX} ${my - 3} ${HX + 8} ${my + 5}" fill="none" ${stroke(3)}/>`;
    default:
      return `<path d="M${HX - 6} ${my} Q${HX} ${my + 5} ${HX + 6} ${my}" fill="none" ${stroke(3)}/>`;
  }
}

function blush(d: CharacterDef, expression: Expression): string {
  const opacity = expression === 'happy' ? 0.65 : expression === 'sad' ? 0.25 : 0.45;
  let out = `<ellipse cx="${HX - 36}" cy="${HY + 26}" rx="10" ry="6" fill="#F28CA8" opacity="${opacity}"/>
    <ellipse cx="${HX + 36}" cy="${HY + 26}" rx="10" ry="6" fill="#F28CA8" opacity="${opacity}"/>`;
  if (d.freckles) {
    out += [-40, -34, -28, 28, 34, 40]
      .map((x, i) => `<circle cx="${HX + x}" cy="${HY + 18 + (i % 2) * 4}" r="1.6" fill="${shade(d.skin, -0.35)}"/>`)
      .join('');
  }
  if (expression === 'sad') {
    // Giọt mồ hôi nhỏ: đang sốt ruột
    out += `<path d="M${HX + 52} ${HY - 22} Q${HX + 58} ${HY - 10} ${HX + 52} ${HY - 6} Q${HX + 46} ${HY - 10} ${HX + 52} ${HY - 22} Z" fill="#BFE6F5" ${stroke(2)}/>`;
  }
  return out;
}

/** Mặt (mắt + má + miệng) — tách riêng để đổi biểu cảm và chớp mắt. */
export function faceSvg(d: CharacterDef, expression: Expression, closedEyes = false): string {
  return eyes(d, expression, closedEyes) + blush(d, expression) + mouth(expression);
}

// ───────────── Phụ kiện ─────────────
function accessories(d: CharacterDef): string {
  let out = '';
  if (d.glasses) {
    const ey = HY + 10;
    out += `<circle cx="${HX - 23}" cy="${ey}" r="15" fill="#FFFFFF" fill-opacity="0.18" ${stroke(3)}/>
      <circle cx="${HX + 23}" cy="${ey}" r="15" fill="#FFFFFF" fill-opacity="0.18" ${stroke(3)}/>
      <path d="M${HX - 8} ${ey - 2} Q${HX} ${ey - 6} ${HX + 8} ${ey - 2}" fill="none" ${stroke(3)}/>`;
  }
  switch (d.hat) {
    case 'cap':
      out += `<path d="M44 82 Q46 34 100 32 Q154 34 156 82 Z" fill="${d.accent}" ${stroke()}/>
        <path d="M96 76 Q140 70 178 84 Q176 94 150 92 Q120 86 96 88 Z" fill="${shade(d.accent, -0.15)}" ${stroke()}/>
        <circle cx="100" cy="34" r="5" fill="${shade(d.accent, -0.15)}" ${stroke(2)}/>`;
      break;
    case 'beanie':
      out += `<path d="M42 86 Q42 28 100 26 Q158 28 158 86 Z" fill="${d.accent}" ${stroke()}/>
        <rect x="38" y="74" width="124" height="20" rx="10" fill="${shade(d.accent, -0.15)}" ${stroke()}/>
        <circle cx="100" cy="24" r="12" fill="#FFFFFF" ${stroke()}/>`;
      break;
    case 'bucket':
      out += `<path d="M52 78 Q56 30 100 30 Q144 30 148 78 Z" fill="${d.accent}" ${stroke()}/>
        <path d="M30 86 Q100 66 170 86 Q170 96 100 90 Q30 96 30 86 Z" fill="${shade(d.accent, -0.12)}" ${stroke()}/>`;
      break;
    default:
      break;
  }
  if (d.hairStyle === 'bob' && d.hat !== 'cap' && d.hat !== 'beanie') {
    // Kẹp tóc hình bông hoa nhỏ
    out += `<g transform="translate(140 70)">${[0, 72, 144, 216, 288]
      .map((a) => `<circle cx="${Math.cos((a * Math.PI) / 180) * 7}" cy="${Math.sin((a * Math.PI) / 180) * 7}" r="5" fill="${d.accent}" ${stroke(2)}/>`)
      .join('')}<circle r="4" fill="#F5C65B" ${stroke(2)}/></g>`;
  }
  if (d.hairStyle === 'ponytail') {
    out += `<circle cx="150" cy="78" r="7" fill="${d.accent}" ${stroke(2)}/>`;
  }
  return out;
}

/** Các bộ phận tách rời, mỗi phần là một SVG cùng khung 200×260 để chồng khớp nhau. */
export interface CharacterParts {
  back: string;
  body: string;
  head: string;
  front: string;
  accessory: string;
}

export function characterParts(d: CharacterDef): CharacterParts {
  return {
    back: svg(CHAR_W, CHAR_H, hairBack(d)),
    body: svg(CHAR_W, CHAR_H, body(d)),
    head: svg(CHAR_W, CHAR_H, head(d)),
    front: svg(CHAR_W, CHAR_H, hairFront(d)),
    accessory: svg(CHAR_W, CHAR_H, accessories(d)),
  };
}

/** Một SVG mặt (cùng khung 200×260). */
export function faceLayer(d: CharacterDef, expression: Expression, closedEyes = false): string {
  return svg(CHAR_W, CHAR_H, faceSvg(d, expression, closedEyes));
}

/** Cả nhân vật trong một SVG (dùng cho trang xem trước, ảnh đại diện). */
export function characterSvg(d: CharacterDef, expression: Expression = 'normal'): string {
  return svg(
    CHAR_W,
    CHAR_H,
    hairBack(d) + body(d) + head(d) + faceSvg(d, expression) + hairFront(d) + accessories(d),
  );
}


/** Vùng mặt (mắt, má, miệng) trong khung 200×260 — lớp mặt chỉ vẽ vùng này cho nhẹ. */
export const FACE_BOX = { x: 40, y: 80, w: 120, h: 80 };
/** Vùng đầu (cả tóc, mũ) — dùng làm ảnh đại diện nhỏ trong hàng chờ. */
export const HEAD_BOX = { x: 20, y: 10, w: 160, h: 160 };

/** Lớp nền: tóc sau + thân + đầu (chưa có mặt). */
export function characterBaseSvg(d: CharacterDef): string {
  return svg(CHAR_W, CHAR_H, hairBack(d) + body(d) + head(d));
}

/** Lớp trên: tóc mái + kính, mũ, kẹp tóc. */
export function characterFrontSvg(d: CharacterDef): string {
  return svg(CHAR_W, CHAR_H, hairFront(d) + accessories(d));
}

/** Lớp mặt, chỉ vùng FACE_BOX. */
export function characterFaceSvg(d: CharacterDef, expression: Expression, closedEyes = false): string {
  const b = FACE_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${faceSvg(d, expression, closedEyes)}</svg>`;
}

/** Ảnh đại diện (đầu) cho hàng chờ. */
export function characterAvatarSvg(d: CharacterDef): string {
  const b = HEAD_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}">${
    hairBack(d) + head(d) + faceSvg(d, 'normal') + hairFront(d) + accessories(d)
  }</svg>`;
}
