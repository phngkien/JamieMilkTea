// Danh mục mọi hình dùng trong cảnh: tên texture, kích thước (theo bố cục) và SVG tương ứng.
// Entity hỏi danh mục này để biết dùng texture nào, cỡ bao nhiêu.
import { shopBackgroundSvg } from '../art/background';
import {
  CHAR_H,
  CHAR_W,
  FACE_BOX,
  HEAD_BOX,
  characterAvatarSvg,
  characterBaseSvg,
  characterFaceSvg,
  characterFrontSvg,
  type CharacterDef,
  type Expression,
} from '../art/characters';
import { CUP_BOTTOM_Y, CUP_H, CUP_TOP_Y, CUP_W, cupBackSvg, cupFrontSvg, iceCubeSvg, lidSvg, toppingPieceSvg } from '../art/cup';
import { DISPENSER_H, DISPENSER_W, dispenserSvg } from '../art/dispenser';
import {
  candyButtonSvg,
  coinSvg,
  cupStackSvg,
  iceBinSvg,
  sealerPressSvg,
  sealerSvg,
  starSvg,
  steamSvg,
  syrupSvg,
  trashSvg,
} from '../art/props';
import { cloudSvg } from '../art/scenery';
import { crop } from '../art/svg';
import { TRAY_H, lockSvg, toppingTraySvg } from '../art/toppingTray';
import { APRON_COLORS, CHARACTERS, STAFF } from '../config/characters';
import { TEAS, getTea } from '../config/teas';
import { TOPPINGS, getTopping } from '../config/toppings';
import type { ShopState, Size } from '../core/types';
import type { Rect, ShopLayout } from '../layout';
import { fitSize, type TextureRequest } from './textures';

export interface Art {
  key: string;
  w: number;
  h: number;
}

/** Chiều cao mỗi mảnh ảnh nền (texture không nên quá lớn trên điện thoại). */
const BG_CHUNK = 1024;

const tag = (L: ShopLayout) => `${L.kind}${L.viewHeight}`;
const art = (key: string, size: { w: number; h: number }): Art => ({ key, w: Math.round(size.w), h: Math.round(size.h) });

// ───────────── Kích thước + tên texture ─────────────

export function backgroundChunks(L: ShopLayout): (Art & { y: number })[] {
  const chunks: (Art & { y: number })[] = [];
  for (let y = 0, i = 0; y < L.worldHeight; y += BG_CHUNK, i++) {
    chunks.push({ key: `bg-${tag(L)}-${i}`, w: L.viewWidth, h: Math.min(BG_CHUNK, L.worldHeight - y), y });
  }
  return chunks;
}

export const dispenserArt = (L: ShopLayout, rect: Rect, tea: string, locked: boolean) =>
  art(`disp-${tag(L)}-${tea}-${locked ? 'lock' : 'open'}`, fitSize(DISPENSER_W, DISPENSER_H, rect.w, rect.h));

export const stackArt = (L: ShopLayout, size: Size) =>
  art(`stack-${tag(L)}-${size}`, fitSize(140, 300, L.cupStacks[size].w, L.cupStacks[size].h * 0.84));

export const sealerArt = (L: ShopLayout) => art(`sealer-${tag(L)}`, fitSize(260, 300, L.sealer.w, L.sealer.h * 0.84));
export const sealerPressArt = (L: ShopLayout) => {
  const s = sealerArt(L);
  return art(`press-${tag(L)}`, { w: (s.w * 130) / 260, h: (s.w * 30) / 260 });
};

export const trashArt = (L: ShopLayout) => art(`trash-${tag(L)}`, fitSize(200, 200, L.trash.w, L.trash.h * 0.74));
export const iceArt = (L: ShopLayout) => art(`icebin-${tag(L)}`, fitSize(220, 200, L.ice.w, L.ice.h * 0.74));
export const syrupArt = (L: ShopLayout) => art(`syrup-${tag(L)}`, fitSize(220, 200, L.syrup.w, L.syrup.h * 0.74));
export const serveArt = (L: ShopLayout) =>
  art(`serve-${tag(L)}`, { w: L.serveButton.w - 8, h: Math.min(L.serveButton.h * 0.62, L.serveButton.w * 0.6) });

/** Mức đầy của khay topping theo số tồn: 0 = gần hết, 1 = vừa, 2 = đầy. */
export function trayLevel(stock: number): 0 | 1 | 2 {
  return stock >= 15 ? 2 : stock >= 6 ? 1 : 0;
}
/** Khay rộng hết ô, cao 72% ô (phần dưới để ghi tên). Trả kèm chiều rộng khay theo đơn vị SVG. */
export const trayArt = (L: ShopLayout, rect: Rect, topping: string, locked: boolean, level: 0 | 1 | 2) => {
  const h = rect.h * 0.72;
  const svgWidth = Math.max(160, (rect.w / h) * TRAY_H);
  return { ...art(`tray-${tag(L)}-${topping}-${locked ? 'lock' : level}`, fitSize(svgWidth, TRAY_H, rect.w, h)), svgWidth };
};
export const lockArt = (L: ShopLayout) => {
  const s = Math.min(L.toppings[0].w, L.toppings[0].h) * 0.32;
  return art(`lock-${tag(L)}`, { w: s, h: (s * 64) / 60 });
};

/** Tỉ lệ phóng hình ly: chiều cao thân ly (đáy → miệng) bằng cupHeight trong bố cục. */
export const cupScale = (L: ShopLayout, size: Size) => L.cupHeight[size] / (CUP_BOTTOM_Y - CUP_TOP_Y);
export const cupBackArt = (L: ShopLayout, size: Size) =>
  art(`cupback-${tag(L)}-${size}`, { w: CUP_W * cupScale(L, size), h: CUP_H * cupScale(L, size) });
export const cupFrontArt = (L: ShopLayout, size: Size) =>
  art(`cupfront-${tag(L)}-${size}`, { w: CUP_W * cupScale(L, size), h: CUP_H * cupScale(L, size) });
export const lidArt = (L: ShopLayout, size: Size) =>
  art(`lid-${tag(L)}-${size}`, { w: CUP_W * cupScale(L, size), h: 30 * cupScale(L, size) });
export const iceCubeArt = (L: ShopLayout) => art(`ice-${tag(L)}`, { w: 24 * cupScale(L, 'M'), h: 24 * cupScale(L, 'M') });
export const pieceArt = (L: ShopLayout, topping: string) =>
  art(`piece-${tag(L)}-${topping}`, { w: 28 * cupScale(L, 'M') * 0.85, h: 28 * cupScale(L, 'M') * 0.85 });

/** Kích thước nhân vật vừa khung `rect`. */
export const characterSize = (rect: Rect) => fitSize(CHAR_W, CHAR_H, rect.w, rect.h);
export const characterBaseArt = (L: ShopLayout, rect: Rect, id: string) => art(`chbase-${tag(L)}-${id}-${rect.w}`, characterSize(rect));
export const characterFrontArt = (L: ShopLayout, rect: Rect, id: string) => art(`chfront-${tag(L)}-${id}-${rect.w}`, characterSize(rect));
export const characterFaceArt = (L: ShopLayout, rect: Rect, id: string, expression: Expression, closed: boolean) => {
  const s = characterSize(rect).w / CHAR_W;
  return art(`chface-${tag(L)}-${id}-${rect.w}-${expression}-${closed ? 'c' : 'o'}`, { w: FACE_BOX.w * s, h: FACE_BOX.h * s });
};
export const avatarArt = (L: ShopLayout, id: string) => {
  const s = L.queue.h * 0.82;
  return art(`avatar-${tag(L)}-${id}`, { w: s, h: (s * HEAD_BOX.h) / HEAD_BOX.w });
};

export const starArt = (L: ShopLayout, filled: boolean) => art(`star-${tag(L)}-${filled ? 1 : 0}`, { w: 64 * ts(L), h: 64 * ts(L) });
export const coinArt = (L: ShopLayout) => art(`coin-${tag(L)}`, { w: 52 * ts(L), h: 52 * ts(L) });
export const steamArt = (L: ShopLayout) => art(`steam-${tag(L)}`, { w: 60 * ts(L), h: 90 * ts(L) });
export const cloudArt = (L: ShopLayout) => art(`cloud-${tag(L)}`, { w: 130 * ts(L), h: 65 * ts(L) });

/** Hệ số cỡ chữ / hình nhỏ: bố cục ngang nhỏ hơn. */
export const ts = (L: ShopLayout) => (L.kind === 'portrait' ? 1 : 0.75);

const EXPRESSIONS: Expression[] = ['normal', 'happy', 'sad'];

// ───────────── Danh sách cần tạo ─────────────

function characterRequests(L: ShopLayout, rect: Rect, d: CharacterDef): TextureRequest[] {
  const reqs: TextureRequest[] = [
    { ...characterBaseArt(L, rect, d.id), svg: characterBaseSvg(d) },
    { ...characterFrontArt(L, rect, d.id), svg: characterFrontSvg(d) },
  ];
  for (const e of EXPRESSIONS) {
    for (const closed of [false, true]) reqs.push({ ...characterFaceArt(L, rect, d.id, e, closed), svg: characterFaceSvg(d, e, closed) });
  }
  return reqs;
}

export function textureRequests(L: ShopLayout, state: ShopState): TextureRequest[] {
  const reqs: TextureRequest[] = [];
  const bg = shopBackgroundSvg(L);
  for (const c of backgroundChunks(L)) reqs.push({ ...c, svg: crop(bg, 0, c.y, c.w, c.h) });

  L.dispensers.forEach((rect, i) => {
    const tea = TEAS[i];
    if (!tea) return;
    const locked = !state.unlockedTeas.includes(tea.id);
    reqs.push({ ...dispenserArt(L, rect, tea.id, locked), svg: dispenserSvg({ tea: tea.color, level: 0.78, locked }) });
  });
  for (const size of ['M', 'L'] as const) {
    reqs.push({ ...stackArt(L, size), svg: cupStackSvg(size) });
    reqs.push({ ...cupBackArt(L, size), svg: cupBackSvg() });
    reqs.push({ ...cupFrontArt(L, size), svg: cupFrontSvg() });
    reqs.push({ ...lidArt(L, size), svg: lidSvg() });
  }
  reqs.push(
    { ...sealerArt(L), svg: sealerSvg() },
    { ...sealerPressArt(L), svg: sealerPressSvg() },
    { ...trashArt(L), svg: trashSvg() },
    { ...iceArt(L), svg: iceBinSvg() },
    { ...syrupArt(L), svg: syrupSvg() },
    { ...serveArt(L), svg: candyButtonSvg(serveArt(L).w, serveArt(L).h) },
    { ...lockArt(L), svg: lockSvg() },
    { ...iceCubeArt(L), svg: iceCubeSvg() },
    { ...starArt(L, true), svg: starSvg(true) },
    { ...starArt(L, false), svg: starSvg(false) },
    { ...coinArt(L), svg: coinSvg() },
    { ...steamArt(L), svg: steamSvg() },
    { ...cloudArt(L), svg: cloudSvg() },
  );
  L.toppings.forEach((rect, i) => {
    const t = TOPPINGS[i];
    if (!t) return;
    const locked = !state.unlockedToppings.includes(t.id);
    const levels: (0 | 1 | 2)[] = locked ? [0] : [0, 1, 2];
    for (const level of levels) {
      reqs.push({
        ...trayArt(L, rect, t.id, locked, level),
        svg: toppingTraySvg({
          color: t.color,
          shape: t.shape,
          amount: [0.15, 0.5, 0.95][level],
          locked,
          seed: i + 1,
          width: trayArt(L, rect, t.id, locked, level).svgWidth,
        }),
      });
    }
    if (!locked) reqs.push({ ...pieceArt(L, t.id), svg: toppingPieceSvg(t.shape, t.color) });
  });
  for (const d of CHARACTERS) {
    reqs.push(...characterRequests(L, L.customer, d));
    reqs.push({ ...avatarArt(L, d.id), svg: characterAvatarSvg(d) });
  }
  for (const d of staffVariants()) reqs.push(...characterRequests(L, L.worker, d));
  return reqs;
}

/** Nhân viên với từng màu tạp dề (mỗi người chơi một màu). */
export function staffVariants(): CharacterDef[] {
  return APRON_COLORS.map((color, i) => ({ ...STAFF, id: `staff${i}`, accent: color }));
}

export function staffFor(color: string): CharacterDef {
  const all = staffVariants();
  return all[Math.max(0, APRON_COLORS.indexOf(color))] ?? all[0];
}

/** Màu trà / topping (giữ một chỗ để entity khỏi import config lung tung). */
export const teaColor = (id: string) => getTea(id).color;
export const toppingDef = (id: string) => getTopping(id);
