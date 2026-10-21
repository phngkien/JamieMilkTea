// Ly đang pha trên bảng gỗ. Gốc toạ độ (0, 0) là giữa đáy ly.
import Phaser from 'phaser';
import { OVERFLOW_AT, SIZES } from '../config/cup';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import type { CupState } from '../core/types';
import { box, text } from './draw';

export class Cup extends Phaser.GameObjects.Container {
  readonly cupId: string;
  /** Vùng chạm để kéo ly. */
  readonly hit: Phaser.GameObjects.Zone;
  private g: Phaser.GameObjects.Graphics;
  private sizeBadge: Phaser.GameObjects.Text;
  private ruinedText: Phaser.GameObjects.Text;
  private height_: number;
  private lastKey = '';

  constructor(scene: Phaser.Scene, x: number, y: number, cup: CupState, height: number, textScale: number) {
    super(scene, x, y);
    this.cupId = cup.id;
    this.height_ = height;
    this.g = scene.add.graphics();
    this.add(this.g);
    const topW = height * 0.72;
    this.sizeBadge = text(scene, topW * 0.32, -height * 0.12, cup.size, {
      size: 34 * textScale,
      title: true,
    });
    this.add(this.sizeBadge);
    this.ruinedText = text(scene, 0, -height * 0.55, UI_TEXT.ruined, {
      size: 50 * textScale,
      title: true,
      color: PALETTE.white,
    }).setVisible(false);
    this.add(this.ruinedText);
    scene.add.existing(this);
    this.hit = scene.add.zone(x, y - height / 2, topW + 40, height + 40).setInteractive({ useHandCursor: true });
  }

  /** Chiều rộng ly ở độ cao t (0 = đáy, 1 = miệng). */
  private widthAt(t: number): number {
    const topW = this.height_ * 0.72;
    const bottomW = topW * 0.76;
    return bottomW + (topW - bottomW) * t;
  }

  placeAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.hit.setPosition(x, y - this.height_ / 2);
  }

  /**
   * Vẽ lại ly. `displayFill` là mực trà đang hiển thị (có thể cao hơn state khi đang giữ rót).
   * `blinkGreen` làm vạch xanh nhấp nháy khi mực trà đang ở trong vùng xanh.
   */
  render(cup: CupState, displayFill: number, blinkGreen: boolean): void {
    const key = JSON.stringify([cup, displayFill.toFixed(3), blinkGreen]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    const { g } = this;
    const h = this.height_;
    const size = SIZES[cup.size];
    g.clear();

    const outline = (t0: number, t1: number) => [
      new Phaser.Math.Vector2(-this.widthAt(t0) / 2, -t0 * h),
      new Phaser.Math.Vector2(this.widthAt(t0) / 2, -t0 * h),
      new Phaser.Math.Vector2(this.widthAt(t1) / 2, -t1 * h),
      new Phaser.Math.Vector2(-this.widthAt(t1) / 2, -t1 * h),
    ];

    // Thân ly nhựa trong
    g.fillStyle(0xffffff, 0.55);
    g.fillPoints(outline(0, 1), true);

    // Topping nằm dưới đáy
    let row = 0;
    let col = 0;
    const dot = h * 0.04;
    for (const t of cup.toppings) {
      g.fillStyle(hex(getTopping(t.id).color), 1);
      for (let i = 0; i < t.scoops * 5; i++) {
        const perRow = 6;
        const cx = -this.widthAt(0) / 2 + dot * 1.5 + col * ((this.widthAt(0) - dot * 3) / (perRow - 1));
        const cy = -dot * 1.2 - row * dot * 1.6;
        g.fillCircle(cx, cy, dot);
        g.lineStyle(2, hex(PALETTE.outline), 0.5);
        g.strokeCircle(cx, cy, dot);
        col++;
        if (col >= perRow) {
          col = 0;
          row++;
        }
      }
    }

    // Trà
    const fill = Math.min(displayFill, OVERFLOW_AT);
    if (cup.tea && fill > 0) {
      g.fillStyle(hex(getTea(cup.tea).color), 0.85);
      g.fillPoints(outline(0, fill), true);
      // Mặt nước
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(-this.widthAt(fill) / 2 + 4, -fill * h, this.widthAt(fill) - 8, 5);
    }

    // Đá viên
    for (let i = 0; i < cup.iceScoops * 3; i++) {
      const s = h * 0.09;
      const cx = -this.widthAt(0.5) / 2 + 12 + ((i * 37) % Math.max(1, this.widthAt(0.5) - s - 24));
      const cy = -h * 0.3 - (i % 3) * s * 0.9 - Math.floor(i / 3) * s * 0.5;
      g.fillStyle(0xeef9ff, 0.85);
      g.fillRoundedRect(cx, cy, s, s, 5);
      g.lineStyle(2, hex('#9FC6DA'), 1);
      g.strokeRoundedRect(cx, cy, s, s, 5);
    }

    // Vạch xanh: hai vạch ngang + thanh dọc bên phải
    const greenAlpha = blinkGreen ? 0.35 : 1;
    const gx = this.widthAt(1) / 2 + 10;
    g.fillStyle(0x58b368, greenAlpha);
    g.fillRoundedRect(gx, -size.greenMax * h, 14, (size.greenMax - size.greenMin) * h, 6);
    g.lineStyle(4, 0x58b368, greenAlpha * 0.9);
    for (const t of [size.greenMin, size.greenMax]) {
      g.lineBetween(-this.widthAt(t) / 2, -t * h, this.widthAt(t) / 2 + 10, -t * h);
    }

    // Viền ly
    g.lineStyle(3, hex(PALETTE.outline), 1);
    g.strokePoints(outline(0, 1), true);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(-this.widthAt(0.7) / 2 + 10, -h * 0.85, 8, h * 0.5);

    // Nắp khi đã ép
    if (cup.sealed) {
      const lidW = this.widthAt(1) + 16;
      box(g, -lidW / 2, -h - 18, lidW, 22, { fill: PALETTE.pinkLight, radius: 10 });
      g.fillStyle(hex(PALETTE.pink), 1);
      g.fillCircle(0, -h - 7, 8);
    }

    // Size
    g.fillStyle(0xffffff, 1);
    g.fillCircle(this.sizeBadge.x, this.sizeBadge.y, 24);
    g.lineStyle(3, hex(PALETTE.outline), 1);
    g.strokeCircle(this.sizeBadge.x, this.sizeBadge.y, 24);

    // Ly hỏng
    this.ruinedText.setVisible(cup.ruined);
    if (cup.ruined) {
      g.fillStyle(hex(PALETTE.danger), 0.55);
      g.fillPoints(outline(0, 1), true);
      // Nước tràn ra ngoài
      g.fillStyle(hex(cup.tea ? getTea(cup.tea).color : PALETTE.danger), 0.8);
      g.fillEllipse(-this.widthAt(0) / 2 - 10, -4, 60, 16);
      g.fillEllipse(this.widthAt(0) / 2 + 14, -2, 50, 12);
    }
  }

  destroy(fromScene?: boolean): void {
    this.hit.destroy();
    super.destroy(fromScene);
  }
}
