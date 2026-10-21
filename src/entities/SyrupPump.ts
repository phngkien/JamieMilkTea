// Nước đường: mỗi lần chạm tăng một mức đường.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { bounce, box, shake, text } from './draw';
import { Prop } from './Prop';

export class SyrupPump extends Prop {
  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect);
    const { g } = this;
    const { w, h } = rect;
    const x = this.left;
    const y = this.top;
    // Khay kim loại
    box(g, x + 6, y + h * 0.08, w - 12, h * 0.64, { fill: '#D8D4CF', radius: 14 });
    // Nước đường màu hổ phách
    box(g, x + 18, y + h * 0.2, w - 36, h * 0.44, { fill: '#E3A64A', radius: 12, stroke: null });
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(x + w * 0.35, y + h * 0.3, w * 0.25, h * 0.07);
    // Cái muỗng
    g.lineStyle(8, hex(PALETTE.outline), 1);
    g.lineBetween(x + w * 0.62, y + h * 0.45, x + w * 0.82, y + h * 0.05);
    g.fillStyle(hex('#E8E4DF'), 1);
    g.fillEllipse(x + w * 0.6, y + h * 0.48, w * 0.2, h * 0.1);
    // Bảng tên
    box(g, x + 6, y + h * 0.76, w - 12, h * 0.22, { fill: PALETTE.pinkLight, radius: 10 });
    this.add(text(scene, 0, y + h * 0.87, UI_TEXT.syrup, { size: Math.min(30, rect.w * 0.2) * textScale, title: true }));
  }

  pump(): void {
    bounce(this.scene, this);
  }

  refuse(): void {
    shake(this.scene, this);
  }
}
