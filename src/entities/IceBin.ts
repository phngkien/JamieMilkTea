// Thùng đá viên: mỗi lần chạm xúc một muỗng đá.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { bounce, box, shake, text } from './draw';
import { Prop } from './Prop';

export class IceBin extends Prop {
  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect);
    const { g } = this;
    const { w, h } = rect;
    const x = this.left;
    const y = this.top;
    box(g, x + 6, y + h * 0.08, w - 12, h * 0.64, { fill: '#D8D4CF', radius: 14 });
    // Các viên đá
    const cube = Math.min(w, h) * 0.16;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const cx = x + 22 + c * (cube + 8) + (r % 2) * cube * 0.4;
        const cy = y + h * 0.2 + r * (cube + 6);
        box(g, cx, cy, cube, cube, { fill: '#DDF1FA', radius: 6, lineWidth: 2 });
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(cx + 5, cy + 5, cube * 0.25, cube * 0.25);
      }
    }
    g.lineStyle(8, hex(PALETTE.outline), 1);
    g.lineBetween(x + w * 0.7, y + h * 0.45, x + w * 0.88, y + h * 0.05);
    // Bảng tên
    box(g, x + 6, y + h * 0.76, w - 12, h * 0.22, { fill: '#D6E8F5', radius: 10 });
    this.add(text(scene, 0, y + h * 0.87, UI_TEXT.ice, { size: Math.min(30, rect.w * 0.2) * textScale, title: true }));
  }

  scoop(): void {
    bounce(this.scene, this);
  }

  refuse(): void {
    shake(this.scene, this);
  }
}
