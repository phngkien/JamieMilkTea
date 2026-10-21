// Máy ép nắp: kéo ly vào đây để ép.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { ShopLayout } from '../layout';
import { sealerArt, sealerPressArt } from '../scenes/artCatalog';
import { label } from './draw';
import { Prop } from './Prop';

export class SealMachine extends Prop {
  private press: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Graphics;
  private highlighted = false;
  private pressY: number;
  /** Tâm khoang đặt ly (toạ độ thế giới). */
  readonly slot: { x: number; y: number };

  constructor(scene: Phaser.Scene, L: ShopLayout, textScale: number) {
    super(scene, L.sealer);
    const { w, h } = this.rect;
    const a = sealerArt(L);
    const top = -h / 2;
    const s = a.h / 300;
    this.ring = scene.add.graphics();
    this.add(this.ring);
    this.add(scene.add.image(0, top, a.key).setOrigin(0.5, 0));
    // Bàn ép nằm ở đỉnh khoang đặt ly (y = 112/300 của hình)
    this.pressY = top + 116 * s;
    this.press = scene.add.image(0, this.pressY, sealerPressArt(L).key).setOrigin(0.5, 0);
    this.add(this.press);
    this.add(label(scene, 0, top + h * 0.92, w - 8, h * 0.14, UI_TEXT.sealer, textScale));
    this.slot = { x: this.x, y: this.y + top + 177 * s };
  }

  /** Phóng nhẹ + vòng hồng khi đang kéo ly tới gần. */
  setHighlight(on: boolean): void {
    if (on === this.highlighted) return;
    this.highlighted = on;
    this.setScale(on ? 1.05 : 1);
    this.ring.clear();
    if (on) {
      this.ring.lineStyle(6, hex(PALETTE.pink), 1);
      this.ring.strokeRoundedRect(-this.rect.w / 2, -this.rect.h / 2, this.rect.w, this.rect.h * 0.84, 26);
    }
  }

  /** Bàn ép "bập" xuống rồi nhấc lên. */
  stamp(): void {
    this.scene.tweens.killTweensOf(this.press);
    this.press.y = this.pressY;
    this.scene.tweens.add({
      targets: this.press,
      y: this.pressY + this.rect.h * 0.22,
      duration: 130,
      yoyo: true,
      hold: 140,
      ease: 'Quad.easeIn',
    });
  }
}
