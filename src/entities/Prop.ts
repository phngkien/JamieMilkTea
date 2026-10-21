// Lớp gốc cho mọi vật thể chạm được trên cảnh: một Container đặt ở tâm hình chữ nhật,
// kèm một Zone trong suốt để nhận chạm (vùng chạm đúng bằng hình chữ nhật).
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { text } from './draw';

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

  private badge: Phaser.GameObjects.Container | null = null;
  private badgeBg: Phaser.GameObjects.Graphics | null = null;
  private badgeText: Phaser.GameObjects.Text | null = null;
  private soldOut: Phaser.GameObjects.Container | null = null;
  private stockShown: number | null = null;
  private lowPulse: Phaser.Tweens.Tween | null = null;

  /**
   * Hiện số tồn ở góc trên bên phải. Hết hàng: phủ xám + chữ "Hết".
   * Sắp hết: nhãn màu cam và nhấp nháy.
   */
  setStock(count: number, lowAt: number): void {
    if (count === this.stockShown) return;
    this.stockShown = count;
    if (!this.badge) this.createBadge();
    const low = count > 0 && count <= lowAt;
    const r = 26;
    this.badgeBg!.clear();
    this.badgeBg!.fillStyle(hex(count === 0 ? PALETTE.grey : low ? '#F29A4A' : PALETTE.cream), 1);
    this.badgeBg!.fillCircle(0, 0, r);
    this.badgeBg!.lineStyle(3, hex(PALETTE.outline), 1);
    this.badgeBg!.strokeCircle(0, 0, r);
    this.badgeText!.setText(String(count)).setColor(low ? PALETTE.white : PALETTE.text);
    this.soldOut!.setVisible(count === 0);
    if (low && !this.lowPulse) {
      this.lowPulse = this.scene.tweens.add({ targets: this.badge, scale: 1.25, duration: 380, yoyo: true, repeat: -1 });
    } else if (!low && this.lowPulse) {
      this.lowPulse.stop();
      this.lowPulse = null;
      this.badge!.setScale(1);
    }
  }

  get isSoldOut(): boolean {
    return this.stockShown === 0;
  }

  private createBadge(): void {
    const { w, h } = this.rect;
    // Lớp "Hết" phủ lên toàn bộ vật
    const cover = this.scene.add.graphics();
    cover.fillStyle(hex(PALETTE.grey), 0.55);
    cover.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    // Chữ "Hết" đặt ở nửa trên để không che tên món
    const label = text(this.scene, 0, -h * 0.2, UI_TEXT.soldOut, { size: Math.min(56, w * 0.32), title: true, color: PALETTE.white });
    label.setStroke(PALETTE.outline, 6);
    this.soldOut = this.scene.add.container(0, 0, [cover, label]).setVisible(false);
    this.badgeBg = this.scene.add.graphics();
    this.badgeText = text(this.scene, 0, 0, '', { size: 28, title: true });
    this.badge = this.scene.add.container(w / 2 - 20, -h / 2 + 20, [this.badgeBg, this.badgeText]);
    this.add([this.soldOut, this.badge]);
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
