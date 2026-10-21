// Thùng đá viên: mỗi lần chạm xúc một muỗng đá.
import Phaser from 'phaser';
import { UI_TEXT } from '../config/strings';
import type { ShopLayout } from '../layout';
import { iceArt } from '../scenes/artCatalog';
import { bounce, label, shake } from './draw';
import { Prop } from './Prop';

export class IceBin extends Prop {
  constructor(scene: Phaser.Scene, L: ShopLayout, textScale: number) {
    super(scene, L.ice);
    const { w, h } = this.rect;
    const a = iceArt(L);
    this.add(scene.add.image(0, -h / 2 + a.h, a.key).setOrigin(0.5, 1));
    this.add(label(scene, 0, h / 2 - h * 0.12, w - 8, h * 0.22, UI_TEXT.ice, textScale, '#D6E8F5'));
  }

  scoop(): void {
    bounce(this.scene, this);
  }

  refuse(): void {
    shake(this.scene, this);
  }
}
