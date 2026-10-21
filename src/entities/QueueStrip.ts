// Dải đầu khách đang xếp hàng chờ (không tính khách đang ở quầy).
import Phaser from 'phaser';
import { CUSTOMER_LOOKS } from '../config/customers';
import { PALETTE, hex } from '../config/palette';
import type { Customer } from '../core/types';
import type { Rect } from '../layout';
import { patienceColor } from './draw';

export class QueueStrip extends Phaser.GameObjects.Graphics {
  private rect: Rect;

  constructor(scene: Phaser.Scene, rect: Rect) {
    super(scene);
    this.rect = rect;
    scene.add.existing(this);
  }

  render(waiting: Customer[]): void {
    this.clear();
    const r = this.rect.h * 0.4;
    waiting.forEach((c, i) => {
      const look = CUSTOMER_LOOKS[c.look % CUSTOMER_LOOKS.length];
      const cx = this.rect.x + r + 8 + i * (r * 2 + 24);
      const cy = this.rect.y + this.rect.h / 2;
      // Vòng kiên nhẫn quanh đầu
      this.fillStyle(0xffffff, 1);
      this.fillCircle(cx, cy, r + 8);
      this.lineStyle(8, patienceColor(c.patience), 1);
      this.beginPath();
      this.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.patience, false);
      this.strokePath();
      this.fillStyle(hex(look.skin), 1);
      this.fillCircle(cx, cy, r);
      this.fillStyle(hex(look.hair), 1);
      this.fillEllipse(cx, cy - r * 0.55, r * 1.8, r * 0.9);
      this.fillStyle(hex(PALETTE.text), 1);
      this.fillCircle(cx - r * 0.32, cy + r * 0.1, r * 0.1);
      this.fillCircle(cx + r * 0.32, cy + r * 0.1, r * 0.1);
      this.lineStyle(2, hex(PALETTE.outline), 1);
      this.strokeCircle(cx, cy, r);
    });
  }
}
