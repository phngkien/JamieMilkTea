// Chuyển hình SVG (src/art) thành texture của Phaser, vẽ đúng kích thước hiển thị để hình sắc nét.
import Phaser from 'phaser';
import { resize } from '../art/svg';

export interface TextureRequest {
  key: string;
  svg: string;
  /** Kích thước texture (đơn vị khung = điểm ảnh của canvas game). */
  w: number;
  h: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không vẽ được SVG'));
    img.src = src;
  });
}

async function rasterize(textures: Phaser.Textures.TextureManager, r: TextureRequest): Promise<void> {
  const w = Math.max(1, Math.round(r.w));
  const h = Math.max(1, Math.round(r.h));
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(resize(r.svg, w, h))}`);
  if (textures.exists(r.key)) return;
  // Vẽ qua canvas để Safari / iPhone dùng ổn định trong WebGL
  const canvas = textures.createCanvas(r.key, w, h);
  if (!canvas) return;
  canvas.context.drawImage(img, 0, 0, w, h);
  canvas.refresh();
}

/** Tạo các texture còn thiếu. Lỗi một hình thì bỏ qua hình đó (game vẫn chạy). */
export async function ensureTextures(scene: Phaser.Scene, requests: TextureRequest[]): Promise<void> {
  const seen = new Set<string>();
  const missing = requests.filter((r) => {
    if (seen.has(r.key) || scene.textures.exists(r.key)) return false;
    seen.add(r.key);
    return true;
  });
  // Chia nhóm để không giải mã quá nhiều ảnh cùng lúc trên điện thoại
  const BATCH = 24;
  for (let i = 0; i < missing.length; i += BATCH) {
    await Promise.all(
      missing.slice(i, i + BATCH).map((r) =>
        rasterize(scene.textures, r).catch((err: unknown) => console.warn(`Texture ${r.key}:`, err)),
      ),
    );
  }
}

/** Kích thước lớn nhất vừa khung (giữ tỉ lệ). */
export function fitSize(srcW: number, srcH: number, boxW: number, boxH: number): { w: number; h: number } {
  const scale = Math.min(boxW / srcW, boxH / srcH);
  return { w: srcW * scale, h: srcH * scale };
}
