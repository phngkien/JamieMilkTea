// Máy ép nắp: kéo ly vào đây để ép.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { box, text } from './draw';
import { Prop } from './Prop';

export class SealMachine extends Prop {
  private press: Phaser.GameObjects.Graphics;
  private highlighted = false;

  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect);
    const { g } = this;
    const w = rect.w;
    const h = rect.h;
    const x = this.left;
    const y = this.top;
    // Thân máy
    box(g, x + w * 0.08, y + h * 0.05, w * 0.84, h * 0.78, { fill: '#C9B8A8', radius: 18 });
    // Cuộn màng nắp phía trên
    box(g, x + w * 0.2, y, w * 0.6, h * 0.16, { fill: PALETTE.pinkLight, radius: 14 });
    // Khoang đặt ly
    box(g, x + w * 0.22, y + h * 0.3, w * 0.56, h * 0.42, { fill: '#8E7B6B', radius: 10 });
    g.fillStyle(hex(PALETTE.mint), 1);
    g.fillCircle(x + w * 0.82, y + h * 0.22, 9);
    // Bảng tên
    box(g, x + 4, y + h * 0.84, w - 8, h * 0.15, { fill: PALETTE.beige, radius: 10 });
    this.add(text(scene, 0, y + h * 0.915, UI_TEXT.sealer, { size: 30 * textScale, title: true }));
    // Bàn ép di chuyển lên xuống
    this.press = scene.add.graphics();
    box(this.press, x + w * 0.26, y + h * 0.3, w * 0.48, h * 0.07, { fill: PALETTE.woodDark, radius: 6 });
    this.add(this.press);
  }

  /** Viền hồng khi đang kéo ly tới gần. */
  setHighlight(on: boolean): void {
    if (on === this.highlighted) return;
    this.highlighted = on;
    this.setScale(on ? 1.05 : 1);
  }

  /** Bàn ép "bập" xuống. */
  stamp(): void {
    this.scene.tweens.add({
      targets: this.press,
      y: this.rect.h * 0.25,
      duration: 120,
      yoyo: true,
      hold: 120,
      ease: 'Quad.easeIn',
    });
  }
}
