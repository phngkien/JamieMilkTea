// Lớp gốc cho mọi vật thể chạm được trên cảnh: một Container đặt ở tâm hình chữ nhật,
// kèm một Zone trong suốt để nhận chạm (vùng chạm đúng bằng hình chữ nhật).
import Phaser from 'phaser';
import type { Rect } from '../layout';

export class Prop extends Phaser.GameObjects.Container {
  readonly rect: Rect;
  readonly hit: Phaser.GameObjects.Zone;
  protected readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, rect: Rect) {
    super(scene, rect.x + rect.w / 2, rect.y + rect.h / 2);
    this.rect = rect;
    this.g = scene.add.graphics();
    this.add(this.g);
    scene.add.existing(this);
    this.hit = scene.add.zone(this.x, this.y, rect.w, rect.h).setInteractive({ useHandCursor: true });
  }

  /** Toạ độ (trong container) của góc trên bên trái. */
  protected get left(): number {
    return -this.rect.w / 2;
  }

  protected get top(): number {
    return -this.rect.h / 2;
  }

  onTap(handler: () => void): this {
    this.hit.on('pointerdown', handler);
    return this;
  }

  destroy(fromScene?: boolean): void {
    this.hit.destroy();
    super.destroy(fromScene);
  }
}
