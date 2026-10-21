// Chồng cốc M hoặc L. Chạm để lấy một ly đặt lên bảng gỗ.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import type { Size } from '../core/types';
import type { Rect } from '../layout';
import { bounce, box, text } from './draw';
import { Prop } from './Prop';

export class CupStack extends Prop {
  readonly size: Size;

  constructor(scene: Phaser.Scene, rect: Rect, size: Size, textScale: number) {
    super(scene, rect);
    this.size = size;
    const { g } = this;
    const w = rect.w;
    const h = rect.h;
    // Kích thước cốc trong chồng: L to hơn M một chút
    const cupW = w * (size === 'L' ? 0.8 : 0.7);
    const stackTop = this.top + h * 0.06;
    const stackBottom = this.top + h * 0.78;
    // Các vành cốc chồng lên nhau
    for (let yy = stackBottom; yy >= stackTop + h * 0.2; yy -= h * 0.05) {
      box(g, -cupW / 2, yy - 10, cupW, 14, { fill: PALETTE.white, radius: 6, alpha: 0.95 });
    }
    // Cốc trên cùng
    g.fillStyle(0xffffff, 0.9);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(-cupW / 2, stackTop),
        new Phaser.Math.Vector2(cupW / 2, stackTop),
        new Phaser.Math.Vector2(cupW * 0.4, stackTop + h * 0.25),
        new Phaser.Math.Vector2(-cupW * 0.4, stackTop + h * 0.25),
      ],
      true,
    );
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(PALETTE.outline).color, 1);
    g.strokePoints(
      [
        new Phaser.Math.Vector2(-cupW / 2, stackTop),
        new Phaser.Math.Vector2(cupW / 2, stackTop),
        new Phaser.Math.Vector2(cupW * 0.4, stackTop + h * 0.25),
        new Phaser.Math.Vector2(-cupW * 0.4, stackTop + h * 0.25),
      ],
      true,
    );
    this.add(text(scene, 0, stackTop + h * 0.16, size, { size: 44 * textScale, title: true }));
    // Bảng tên phía dưới
    box(g, this.left + 6, this.top + h * 0.84, w - 12, h * 0.15, { fill: PALETTE.mint, radius: 10 });
    this.add(text(scene, 0, this.top + h * 0.915, `Cốc ${size}`, { size: 30 * textScale, title: true }));
  }

  pop(): void {
    bounce(this.scene, this);
  }
}
