// Công cụ chung để vẽ hình bằng SVG. Mỗi hình trong src/art là một hàm trả về chuỗi SVG.
import { PALETTE } from '../config/palette';

/** Màu nét viền nâu và độ dày nét (theo đơn vị viewBox của từng hình). */
export const INK = PALETTE.outline;
export const LINE = 3;

/** Bọc nội dung thành một thẻ <svg> hoàn chỉnh. */
export function svg(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

/** Thuộc tính nét viền chuẩn. */
export function stroke(width = LINE, color: string = INK): string {
  return `stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;
}

/** Làm tối / sáng một màu hex theo tỉ lệ (âm = tối hơn). Dùng để tạo bóng mềm. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(Math.max(0, Math.min(255, v)));
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

/** Số ngẫu nhiên cố định theo hạt giống (để hạt topping, đá... luôn nằm cùng chỗ). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let uidCounter = 0;
/** Mã riêng cho gradient / clipPath để nhiều SVG trên cùng trang không đụng nhau. */
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

/**
 * Đặt một SVG con vào trong SVG lớn ở vị trí (x, y) với kích thước w×h
 * (biến thẻ <svg> ngoài cùng thành <svg> lồng nhau, giữ nguyên viewBox).
 */
export function place(child: string, x: number, y: number, w: number, h: number, stretch = false): string {
  return child.replace(
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="[^"]*" height="[^"]*"/,
    `<svg x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${stretch ? 'none' : 'xMidYMid meet'}"`,
  );
}

/** Đổi kích thước hiển thị (width/height) của một SVG, giữ nguyên viewBox — để vẽ ra ảnh đúng độ phân giải. */
export function resize(source: string, w: number, h: number): string {
  return source.replace(
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="[^"]*" height="[^"]*"/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" preserveAspectRatio="none"`,
  );
}

/** Cắt một vùng của SVG (đổi viewBox) — dùng để chia ảnh nền lớn thành nhiều mảnh. */
export function crop(source: string, x: number, y: number, w: number, h: number): string {
  return source.replace(
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="[^"]*" height="[^"]*" viewBox="[^"]*"/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`,
  );
}
