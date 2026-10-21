// Hàm vẽ dùng chung cho hình tạm (khối màu + chữ). Hình đẹp bằng SVG làm ở prompt sau.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';

export const FONT_TITLE = '"Baloo 2", "Nunito", sans-serif';
export const FONT_BODY = '"Nunito", "Baloo 2", sans-serif';
export const OUTLINE_WIDTH = 3;

export interface BoxStyle {
  fill: string;
  stroke?: string | null;
  radius?: number;
  alpha?: number;
  lineWidth?: number;
}

/** Hình chữ nhật bo góc, viền nâu mảnh. (x, y) là góc trên bên trái. */
export function box(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, style: BoxStyle): void {
  const radius = Math.min(style.radius ?? 16, w / 2, h / 2);
  g.fillStyle(hex(style.fill), style.alpha ?? 1);
  g.fillRoundedRect(x, y, w, h, radius);
  if (style.stroke !== null) {
    g.lineStyle(style.lineWidth ?? OUTLINE_WIDTH, hex(style.stroke ?? PALETTE.outline), 1);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
}

export interface TextOptions {
  size: number;
  color?: string;
  title?: boolean;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  wrapWidth?: number;
  originX?: number;
  originY?: number;
}

export function text(scene: Phaser.Scene, x: number, y: number, content: string, opts: TextOptions): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, content, {
    fontFamily: opts.title ? FONT_TITLE : FONT_BODY,
    fontSize: `${Math.round(opts.size)}px`,
    fontStyle: opts.bold === false ? 'normal' : opts.title ? '700' : '600',
    color: opts.color ?? PALETTE.text,
    align: opts.align ?? 'center',
    wordWrap: opts.wrapWidth ? { width: opts.wrapWidth, useAdvancedWrap: true } : undefined,
    lineSpacing: Math.round(opts.size * 0.1),
  });
  t.setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  return t;
}

/** Ổ khóa nhỏ vẽ bằng khối. (x, y) là tâm. */
export function drawLock(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
  const bodyW = size;
  const bodyH = size * 0.8;
  g.lineStyle(size * 0.14, hex(PALETTE.outline), 1);
  g.beginPath();
  g.arc(x, y - bodyH * 0.25, size * 0.32, Math.PI, 0, false);
  g.strokePath();
  box(g, x - bodyW / 2, y - bodyH * 0.25, bodyW, bodyH, { fill: PALETTE.gold, radius: size * 0.15 });
  g.fillStyle(hex(PALETTE.outline), 1);
  g.fillCircle(x, y + bodyH * 0.12, size * 0.1);
}

/** Màu thanh kiên nhẫn: xanh → vàng → đỏ. */
export function patienceColor(p: number): number {
  const green = Phaser.Display.Color.ValueToColor(0x7cc46a);
  const yellow = Phaser.Display.Color.ValueToColor(hex(PALETTE.gold));
  const red = Phaser.Display.Color.ValueToColor(hex(PALETTE.danger));
  const lerp = (a: Phaser.Display.Color, b: Phaser.Display.Color, t: number) => {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, Math.round(t * 100));
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  };
  if (p > 0.5) return lerp(yellow, green, (p - 0.5) * 2);
  return lerp(red, yellow, Math.max(0, p) * 2);
}

/** Thanh tiến độ bo tròn. */
export function drawBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  color: number,
): void {
  box(g, x, y, w, h, { fill: PALETTE.white, radius: h / 2 });
  const inner = Math.max(0, Math.min(1, value)) * (w - 8);
  if (inner > 0) {
    g.fillStyle(color, 1);
    g.fillRoundedRect(x + 4, y + 4, Math.max(inner, h - 8), h - 8, (h - 8) / 2);
  }
}

/** Lắc qua lại (báo lỗi, ổ khóa). */
export function shake(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, amount = 12): void {
  // Nhớ vị trí gốc để lắc nhiều lần liên tiếp không bị lệch dần
  const startX = (target.getData('baseX') as number | undefined) ?? target.x;
  target.setData('baseX', startX);
  scene.tweens.killTweensOf(target);
  scene.tweens.add({
    targets: target,
    x: { from: startX - amount, to: startX + amount },
    duration: 60,
    yoyo: true,
    repeat: 2,
    onComplete: () => {
      target.x = startX;
    },
  });
}

/** Nảy nhẹ khi được chạm. */
export function bounce(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject): void {
  scene.tweens.add({ targets: target, scaleX: 1.06, scaleY: 0.94, duration: 70, yoyo: true });
}

/** Nhãn gỗ nhỏ có chữ (tên đồ vật). (x, y) là tâm. */
export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  textScale: number,
  fillColor: string = PALETTE.beige,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const r = Math.min(14, h / 2.5);
  g.fillStyle(hex(PALETTE.woodDark), 0.55);
  g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
  box(g, -w / 2, -h / 2, w, h, { fill: fillColor, radius: r, lineWidth: 2.5 });
  const t = text(scene, 0, 0, content, { size: Math.min(30 * textScale, h * 0.62, (w / Math.max(4, content.length)) * 1.7), title: true });
  return scene.add.container(x, y, [g, t]);
}

/** Thu nhỏ cỡ chữ cho tới khi vừa chiều rộng (không ngắt giữa chữ). Chữ hai từ trở lên được xuống dòng giữa các từ. */
export function fitText(t: Phaser.GameObjects.Text, maxW: number, minSize = 14, allowWrap = true): Phaser.GameObjects.Text {
  let size = parseInt(String(t.style.fontSize), 10) || 30;
  const words = t.text.split(' ');
  // Thử một dòng trước; quá dài mà có nhiều từ thì chia đôi thành hai dòng
  if (allowWrap && t.width > maxW && words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    t.setText(`${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')}`);
  }
  while (t.width > maxW && size > minSize) {
    size -= 1;
    t.setFontSize(size);
  }
  return t;
}
