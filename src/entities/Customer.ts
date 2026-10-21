// Khách ở quầy (hình tạm): thân, đầu, tóc, mắt, miệng đổi theo tâm trạng, tên.
import Phaser from 'phaser';
import { CUSTOMER_LOOKS } from '../config/customers';
import { PALETTE, hex } from '../config/palette';
import type { Customer as CustomerData } from '../core/types';
import type { Rect } from '../layout';
import { box, text } from './draw';

export type Mood = 'happy' | 'normal' | 'sad';

export class Customer extends Phaser.GameObjects.Container {
  readonly customerId: string;
  private face: Phaser.GameObjects.Graphics;
  private mood: Mood | null = null;
  private headR: number;
  private headY: number;

  constructor(scene: Phaser.Scene, rect: Rect, data: CustomerData, textScale: number) {
    super(scene, rect.x + rect.w / 2, rect.y + rect.h);
    this.customerId = data.id;
    const look = CUSTOMER_LOOKS[data.look % CUSTOMER_LOOKS.length];
    const w = rect.w;
    const h = rect.h;
    this.headR = Math.min(w * 0.3, h * 0.2);
    this.headY = -h * 0.62;
    const body = scene.add.graphics();
    // Tóc sau
    body.fillStyle(hex(look.hair), 1);
    body.fillCircle(0, this.headY - this.headR * 0.1, this.headR * 1.12);
    // Thân (áo)
    box(body, -w * 0.36, -h * 0.4, w * 0.72, h * 0.32, { fill: look.shirt, radius: 30 });
    // Cổ + đầu
    body.fillStyle(hex(look.skin), 1);
    body.fillRect(-12, this.headY + this.headR * 0.8, 24, 26);
    body.fillCircle(0, this.headY, this.headR);
    body.lineStyle(3, hex(PALETTE.outline), 1);
    body.strokeCircle(0, this.headY, this.headR);
    // Tóc mái
    body.fillStyle(hex(look.hair), 1);
    body.fillEllipse(0, this.headY - this.headR * 0.62, this.headR * 1.9, this.headR * 0.8);
    this.add(body);
    this.face = scene.add.graphics();
    this.add(this.face);
    // Bảng tên
    const name = text(scene, 0, -h * 0.03, data.name, { size: 30 * textScale, title: true });
    const tagW = Math.max(name.width + 24, w * 0.6);
    const tag = scene.add.graphics();
    box(tag, -tagW / 2, -h * 0.08, tagW, h * 0.1, { fill: PALETTE.white, radius: 12, lineWidth: 2 });
    this.add([tag, name]);
    this.setMood('normal');
    scene.add.existing(this);
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    const g = this.face;
    const r = this.headR;
    const y = this.headY;
    g.clear();
    // Mắt
    g.fillStyle(hex(PALETTE.text), 1);
    g.fillEllipse(-r * 0.36, y + r * 0.05, r * 0.16, r * 0.24);
    g.fillEllipse(r * 0.36, y + r * 0.05, r * 0.16, r * 0.24);
    // Má hồng
    g.fillStyle(hex(PALETTE.pink), 0.45);
    g.fillEllipse(-r * 0.55, y + r * 0.35, r * 0.3, r * 0.16);
    g.fillEllipse(r * 0.55, y + r * 0.35, r * 0.3, r * 0.16);
    // Miệng
    g.lineStyle(4, hex(PALETTE.text), 1);
    g.beginPath();
    if (mood === 'happy') g.arc(0, y + r * 0.35, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI, false);
    else if (mood === 'sad') g.arc(0, y + r * 0.62, r * 0.2, 1.2 * Math.PI, 1.8 * Math.PI, false);
    else {
      g.moveTo(-r * 0.15, y + r * 0.5);
      g.lineTo(r * 0.15, y + r * 0.5);
    }
    g.strokePath();
  }

  /** Đi vào từ bên trái. */
  enter(): void {
    const targetX = this.x;
    this.x = targetX - 300;
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, x: targetX, alpha: 1, duration: 450, ease: 'Back.easeOut' });
  }

  /** Đi ra rồi tự hủy. */
  leave(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      x: this.x - 300,
      alpha: 0,
      duration: 450,
      delay: 500,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  /** Nhún nhẹ khi đang chờ. */
  idle(time: number): void {
    this.scaleY = 1 + Math.sin(time / 380) * 0.012;
  }
}
