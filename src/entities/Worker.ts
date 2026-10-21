// Nhân viên (người chơi): tạp dề theo màu outfit, tên hiện trên đầu, nhún nhẹ khi đứng chờ.
import Phaser from 'phaser';
import { STAFF } from '../config/characters';
import { PALETTE } from '../config/palette';
import type { ShopLayout } from '../layout';
import { Character } from './Customer';
import { label } from './draw';

export class Worker extends Character {
  constructor(scene: Phaser.Scene, L: ShopLayout, name: string, textScale: number) {
    super(scene, L, L.worker, STAFF);
    // Tên nhân viên đặt bên trái đầu (phía trên là mái hiên)
    const h = this.characterHeight;
    const w = 40 + name.length * 16 * textScale;
    this.add(label(scene, -L.worker.w * 0.5 - w * 0.2, -h * 0.72, w, 38 * textScale, name, textScale, PALETTE.pinkLight));
  }

  /** Vui vẻ nhảy lên khi giao ly đạt điểm cao. */
  cheer(): void {
    this.setMood('happy');
    this.scene.tweens.add({ targets: this, y: this.y - 14, duration: 140, yoyo: true, repeat: 1 });
    this.scene.time.delayedCall(1400, () => this.setMood('normal'));
  }
}
