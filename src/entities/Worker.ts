// Nhân viên (người chơi): tạp dề theo màu outfit, tên hiện trên đầu, nhún nhẹ khi đứng chờ.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import type { Rect, ShopLayout } from '../layout';
import { staffFor } from '../scenes/artCatalog';
import { Character } from './Customer';
import { label } from './draw';

export class Worker extends Character {
  readonly uid: string;

  constructor(scene: Phaser.Scene, L: ShopLayout, spot: Rect, uid: string, name: string, color: string, textScale: number) {
    super(scene, L, spot, staffFor(color));
    this.uid = uid;
    // Tên nhân viên đặt bên trái đầu (phía trên là mái hiên)
    const h = this.characterHeight;
    const w = 40 + name.length * 16 * textScale;
    this.add(label(scene, -spot.w * 0.5 - w * 0.2, -h * 0.72, w, 38 * textScale, name, textScale, PALETTE.pinkLight));
  }

  /** Vui vẻ nhảy lên khi giao ly đạt điểm cao. */
  cheer(): void {
    this.setMood('happy');
    this.scene.tweens.add({ targets: this, y: this.y - 14, duration: 140, yoyo: true, repeat: 1 });
    this.scene.time.delayedCall(1400, () => this.setMood('normal'));
  }
}
