// Chồng cốc M hoặc L. Chạm để lấy một ly đặt lên bảng gỗ.
import Phaser from 'phaser';
import { UI_TEXT, fill } from '../config/strings';
import type { Size } from '../core/types';
import type { ShopLayout } from '../layout';
import { stackArt } from '../scenes/artCatalog';
import { bounce, label, text } from './draw';
import { Prop } from './Prop';

export class CupStack extends Prop {
  readonly size: Size;

  constructor(scene: Phaser.Scene, L: ShopLayout, size: Size, textScale: number) {
    super(scene, L.cupStacks[size]);
    this.size = size;
    const { w, h } = this.rect;
    const a = stackArt(L, size);
    const top = -h / 2;
    this.add(scene.add.image(0, top, a.key).setOrigin(0.5, 0));
    // Chữ M / L trong vòng tròn trên thân cốc (vòng tròn ở y = 80/300 của hình)
    this.add(text(scene, 0, top + (80 / 300) * a.h, size, { size: 44 * textScale, title: true }));
    this.add(label(scene, 0, top + h * 0.92, w - 8, h * 0.14, fill(UI_TEXT.cupStack, { size }), textScale));
  }

  pop(): void {
    bounce(this.scene, this);
  }
}
