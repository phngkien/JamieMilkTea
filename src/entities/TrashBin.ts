// Thùng rác: kéo ly vào để bỏ.
import Phaser from 'phaser';
import { UI_TEXT } from '../config/strings';
import type { ShopLayout } from '../layout';
import { trashArt } from '../scenes/artCatalog';
import { label } from './draw';
import { Prop } from './Prop';

export class TrashBin extends Prop {
  private highlighted = false;
  private lidImage: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, L: ShopLayout, textScale: number) {
    super(scene, L.trash);
    const { w, h } = this.rect;
    const a = trashArt(L);
    this.lidImage = scene.add.image(0, -h / 2 + a.h, a.key).setOrigin(0.5, 1);
    this.add(this.lidImage);
    this.add(label(scene, 0, h / 2 - h * 0.12, w - 8, h * 0.22, UI_TEXT.trash, textScale));
  }

  setHighlight(on: boolean): void {
    if (on === this.highlighted) return;
    this.highlighted = on;
    // Thùng rác "há miệng" khi ly tới gần
    this.scene.tweens.add({ targets: this.lidImage, scaleX: on ? 1.12 : 1, scaleY: on ? 1.08 : 1, duration: 120 });
  }
}
