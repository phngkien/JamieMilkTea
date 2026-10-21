// Thùng rác: kéo ly vào để bỏ.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { box, text } from './draw';
import { Prop } from './Prop';

export class TrashBin extends Prop {
  private highlighted = false;

  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect);
    const { g } = this;
    const { w, h } = rect;
    const x = this.left;
    const y = this.top;
    // Nắp và thân thùng
    box(g, x + w * 0.18, y + h * 0.06, w * 0.64, h * 0.1, { fill: '#9E9A96', radius: 8 });
    box(g, x + w * 0.24, y + h * 0.16, w * 0.52, h * 0.56, { fill: '#B9B5B0', radius: 10 });
    for (let i = 1; i < 4; i++) {
      g.lineStyle(3, Phaser.Display.Color.HexStringToColor(PALETTE.outline).color, 0.35);
      const lx = x + w * 0.24 + (w * 0.52 * i) / 4;
      g.lineBetween(lx, y + h * 0.22, lx, y + h * 0.66);
    }
    box(g, x + 6, y + h * 0.76, w - 12, h * 0.22, { fill: PALETTE.beige, radius: 10 });
    this.add(text(scene, 0, y + h * 0.87, UI_TEXT.trash, { size: Math.min(30, rect.w * 0.2) * textScale, title: true }));
  }

  setHighlight(on: boolean): void {
    if (on === this.highlighted) return;
    this.highlighted = on;
    this.setScale(on ? 1.08 : 1);
  }
}
