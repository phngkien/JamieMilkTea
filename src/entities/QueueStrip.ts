// Dải đầu khách đang xếp hàng chờ (không tính khách đang ở quầy), mỗi đầu có vòng kiên nhẫn.
import Phaser from 'phaser';
import { CHARACTERS } from '../config/characters';
import { PALETTE, hex } from '../config/palette';
import type { Customer } from '../core/types';
import type { ShopLayout } from '../layout';
import { avatarArt } from '../scenes/artCatalog';
import { patienceColor } from './draw';

export class QueueStrip extends Phaser.GameObjects.Container {
  private layout: ShopLayout;
  private rings: Phaser.GameObjects.Graphics;
  private avatars = new Map<string, Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene, L: ShopLayout) {
    super(scene, L.queue.x, L.queue.y);
    this.layout = L;
    this.rings = scene.add.graphics();
    this.add(this.rings);
    scene.add.existing(this);
  }

  private slotX(i: number): number {
    const r = this.layout.queue.h / 2;
    return r + 6 + i * (r * 2 + 22);
  }

  render(waiting: Customer[]): void {
    const r = this.layout.queue.h / 2;
    const cy = r;
    // Đầu khách: thêm người mới (trượt vào), bỏ người đã rời hàng, dời chỗ khi hàng tiến lên
    const ids = new Set(waiting.map((c) => c.id));
    for (const [id, img] of this.avatars) {
      if (!ids.has(id)) {
        img.destroy();
        this.avatars.delete(id);
      }
    }
    waiting.forEach((c, i) => {
      let img = this.avatars.get(c.id);
      if (!img) {
        const def = CHARACTERS[c.look % CHARACTERS.length];
        img = this.scene.add.image(this.slotX(i) - 40, cy, avatarArt(this.layout, def.id).key).setAlpha(0);
        this.add(img);
        this.avatars.set(c.id, img);
        this.scene.tweens.add({ targets: img, x: this.slotX(i), alpha: 1, duration: 350, ease: 'Quad.easeOut' });
      } else if (Math.abs(img.x - this.slotX(i)) > 1 && !this.scene.tweens.isTweening(img)) {
        this.scene.tweens.add({ targets: img, x: this.slotX(i), duration: 300 });
      }
    });
    // Vòng kiên nhẫn
    const g = this.rings;
    g.clear();
    waiting.forEach((c, i) => {
      const x = this.slotX(i);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, cy, r + 2);
      g.lineStyle(3, hex(PALETTE.outline), 1);
      g.strokeCircle(x, cy, r + 2);
      g.lineStyle(7, patienceColor(c.patience), 1);
      g.beginPath();
      g.arc(x, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.patience, false);
      g.strokePath();
    });
  }
}
