// Nút "Giao" kiểu nút kẹo: lún xuống khi nhấn. Giao ly đã ép nắp cho khách đang ở quầy.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { ShopLayout } from '../layout';
import { serveArt } from '../scenes/artCatalog';
import { text } from './draw';
import { Prop } from './Prop';

export class ServeButton extends Prop {
  private enabled = true;
  private face: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, L: ShopLayout, textScale: number) {
    super(scene, L.serveButton);
    const a = serveArt(L);
    const img = scene.add.image(0, 0, a.key);
    const t = text(scene, 0, -a.h * 0.05, UI_TEXT.serve, { size: 54 * textScale, title: true, color: PALETTE.white });
    t.setStroke(PALETTE.outline, 5);
    this.face = scene.add.container(0, 0, [img, t]);
    this.add(this.face);
    // Nhấn thì lún xuống một chút
    this.hit.on('pointerdown', () => {
      if (this.enabled) this.scene.tweens.add({ targets: this.face, y: a.h * 0.06, duration: 60, yoyo: true });
    });
    this.setEnabled(false);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.45);
    if (enabled) this.scene.tweens.add({ targets: this, scale: { from: 1.12, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }
}
