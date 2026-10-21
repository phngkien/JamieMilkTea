// Nước đường: mỗi lần chạm tăng một mức đường.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { ShopLayout } from '../layout';
import { syrupArt } from '../scenes/artCatalog';
import { bounce, label, shake } from './draw';
import { Prop } from './Prop';

export class SyrupPump extends Prop {
  constructor(scene: Phaser.Scene, L: ShopLayout, textScale: number) {
    super(scene, L.syrup);
    const { w, h } = this.rect;
    const a = syrupArt(L);
    this.add(scene.add.image(0, -h / 2 + a.h, a.key).setOrigin(0.5, 1));
    this.add(label(scene, 0, h / 2 - h * 0.12, w - 8, h * 0.22, UI_TEXT.syrup, textScale, PALETTE.pinkLight));
  }

  pump(): void {
    bounce(this.scene, this);
  }

  refuse(): void {
    shake(this.scene, this);
  }
}
