// Ly đang pha trên bảng gỗ. Gốc toạ độ (0, 0) là giữa đáy ly.
// Ghép lớp: thân sau → nước trà (vẽ động, có gợn) → topping → đá → viền trước → nắp.
import Phaser from 'phaser';
import { CUP_BOTTOM_HALF, CUP_BOTTOM_Y, CUP_H, CUP_TOP_HALF } from '../art/cup';
import { OVERFLOW_AT, SIZES } from '../config/cup';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import { getTea } from '../config/teas';
import type { CupState } from '../core/types';
import type { ShopLayout } from '../layout';
import { cupBackArt, cupFrontArt, cupScale, iceCubeArt, lidArt, pieceArt } from '../scenes/artCatalog';
import { text } from './draw';

/** Vị trí cố định (theo thứ tự) cho từng viên đá / hạt topping, để mỗi lần vẽ lại không bị nhảy chỗ. */
const ICE_SLOTS = [
  [-0.45, 0.55, -12], [0.3, 0.6, 14], [-0.05, 0.68, 4],
  [0.42, 0.48, -8], [-0.3, 0.42, 18], [0.1, 0.5, -16],
];

export class Cup extends Phaser.GameObjects.Container {
  readonly cupId: string;
  /** Vùng chạm để kéo ly. */
  readonly hit: Phaser.GameObjects.Zone;
  private layout: ShopLayout;
  private s: number;
  private bodyH: number;
  private liquid: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private iceLayer: Phaser.GameObjects.Container;
  private toppingLayer: Phaser.GameObjects.Container;
  private lid: Phaser.GameObjects.Image;
  private ruinedText: Phaser.GameObjects.Text;
  private iceCount = 0;
  private toppingCount = 0;
  private lastStatic = '';
  private sealedShown = false;
  /** Hệ số thu nhỏ (bảng có nhiều ly khi chơi chung). */
  private cupScaleFactor = 1;
  private ring: Phaser.GameObjects.Graphics;
  private ringColor: number | null = null;

  constructor(scene: Phaser.Scene, L: ShopLayout, x: number, y: number, cup: CupState, textScale: number) {
    super(scene, x, y);
    this.cupId = cup.id;
    this.layout = L;
    this.s = cupScale(L, cup.size);
    this.bodyH = L.cupHeight[cup.size];
    const originY = CUP_BOTTOM_Y / CUP_H;
    // Viền màu dưới đáy ly: cùng màu với khách mà ly được làm cho
    this.ring = scene.add.graphics();
    this.add(this.ring);
    this.add(scene.add.image(0, 0, cupBackArt(L, cup.size).key).setOrigin(0.5, originY));
    this.toppingLayer = scene.add.container(0, 0);
    this.liquid = scene.add.graphics();
    this.iceLayer = scene.add.container(0, 0);
    this.add([this.liquid, this.toppingLayer, this.iceLayer]);
    this.add(scene.add.image(0, 0, cupFrontArt(L, cup.size).key).setOrigin(0.5, originY));
    this.overlay = scene.add.graphics();
    this.add(this.overlay);
    // Nắp: mép dưới (y = 22/30 của hình nắp) trùng miệng ly
    this.lid = scene.add.image(0, -this.bodyH, lidArt(L, cup.size).key).setOrigin(0.5, 22 / 30).setVisible(false);
    this.add(this.lid);
    const badgeX = this.halfAt(0.15) - 6;
    const badge = scene.add.graphics();
    badge.fillStyle(0xffffff, 1);
    badge.fillCircle(badgeX, -this.bodyH * 0.14, 22 * textScale + 4);
    badge.lineStyle(3, hex(PALETTE.outline), 1);
    badge.strokeCircle(badgeX, -this.bodyH * 0.14, 22 * textScale + 4);
    this.add([badge, text(scene, badgeX, -this.bodyH * 0.14, cup.size, { size: 32 * textScale, title: true })]);
    this.ruinedText = text(scene, 0, -this.bodyH * 0.55, UI_TEXT.ruined, { size: 52 * textScale, title: true, color: PALETTE.white });
    this.ruinedText.setStroke(PALETTE.danger, 8).setVisible(false);
    this.add(this.ruinedText);
    scene.add.existing(this);
    const topW = this.halfAt(1) * 2;
    this.hit = scene.add.zone(x, y - this.bodyH / 2, topW + 40, this.bodyH + 40).setInteractive({ useHandCursor: true });
  }

  /** Nửa chiều rộng ly ở độ cao t (0 = đáy, 1 = miệng), theo đơn vị khung. */
  private halfAt(t: number): number {
    return (CUP_BOTTOM_HALF + (CUP_TOP_HALF - CUP_BOTTOM_HALF) * t) * this.s;
  }

  placeAt(x: number, y: number): void {
    this.setPosition(x, y);
    this.hit.setPosition(x, y - (this.bodyH * this.cupScaleFactor) / 2);
  }

  /** Thu nhỏ / phóng to ly (vùng chạm đổi theo). */
  setCupScale(s: number): void {
    if (s === this.cupScaleFactor) return;
    this.cupScaleFactor = s;
    this.setScale(s);
    const topW = this.halfAt(1) * 2;
    this.hit.setSize((topW + 40) * s, (this.bodyH + 40) * s);
    if (this.hit.input?.hitArea instanceof Phaser.Geom.Rectangle) this.hit.input.hitArea.setSize((topW + 40) * s, (this.bodyH + 40) * s);
    this.placeAt(this.x, this.y);
  }

  /** Viền màu theo khách (null = không viền). */
  setOrderColor(color: number | null): void {
    if (color === this.ringColor) return;
    this.ringColor = color;
    this.ring.clear();
    if (color === null) return;
    this.ring.fillStyle(color, 0.9);
    this.ring.fillEllipse(0, 2, this.halfAt(0) * 2 + 30, 26);
    this.ring.lineStyle(3, hex(PALETTE.outline), 1);
    this.ring.strokeEllipse(0, 2, this.halfAt(0) * 2 + 30, 26);
  }

  /** Hình thang thân ly từ t0 tới t1 (toạ độ trong container). */
  private band(t0: number, t1: number): Phaser.Math.Vector2[] {
    const H = this.bodyH;
    return [
      new Phaser.Math.Vector2(-this.halfAt(t0), -t0 * H),
      new Phaser.Math.Vector2(this.halfAt(t0), -t0 * H),
      new Phaser.Math.Vector2(this.halfAt(t1), -t1 * H),
      new Phaser.Math.Vector2(-this.halfAt(t1), -t1 * H),
    ];
  }

  /**
   * Vẽ lại ly. `displayFill` là mực trà đang hiển thị (có thể cao hơn state khi đang giữ rót).
   * `pouringTea`: loại trà đang rót dở trên máy này (ly rỗng chưa có trà trong state) → mặt nước gợn mạnh hơn.
   * `blinkGreen`: vạch xanh nhấp nháy.
   */
  render(
    cup: CupState,
    displayFill: number,
    blinkGreen: boolean,
    pouringTea: string | null,
    time: number,
    animate: boolean,
  ): void {
    const pouring = pouringTea !== null;
    const teaId = cup.tea ?? pouringTea;
    const H = this.bodyH;
    // Nước trà + gợn sóng mặt nước (vẽ mỗi khung hình khi có trà)
    const g = this.liquid;
    g.clear();
    const fill = Math.min(displayFill, OVERFLOW_AT);
    if (teaId && fill > 0.005) {
      const color = getTea(teaId).color;
      const surfaceY = -fill * H;
      const half = this.halfAt(fill);
      const amp = animate ? (pouring ? 5 : 1.6) : 0;
      const pts = [new Phaser.Math.Vector2(-this.halfAt(0), 0), new Phaser.Math.Vector2(this.halfAt(0), 0)];
      const steps = 12;
      for (let i = steps; i >= 0; i--) {
        const x = -half + (2 * half * i) / steps;
        pts.push(new Phaser.Math.Vector2(x, surfaceY + Math.sin(time / 140 + i * 0.9) * amp));
      }
      g.fillStyle(hex(color), 0.9);
      g.fillPoints(pts, true);
      // Lớp sữa sáng gần mặt nước
      g.fillStyle(0xffffff, 0.22);
      g.fillRect(-half + 4, surfaceY + 2, half * 2 - 8, Math.min(14, fill * H - 2));
    }

    // Phần ít đổi (đá, topping, nắp, vạch xanh, hỏng): chỉ cập nhật khi khác
    const key = `${cup.iceScoops}|${JSON.stringify(cup.toppings)}|${cup.sealed}|${cup.ruined}|${blinkGreen}`;
    if (key === this.lastStatic) return;
    this.lastStatic = key;
    this.syncIce(cup.iceScoops * 3, animate);
    this.syncToppings(cup, animate);
    this.drawOverlay(cup, blinkGreen);
    if (cup.sealed && !this.sealedShown) {
      this.sealedShown = true;
      this.lid.setVisible(true);
      if (animate) {
        // Nắp "bập" xuống
        this.lid.y = -H - 40;
        this.scene.tweens.add({ targets: this.lid, y: -H, duration: 180, ease: 'Bounce.easeOut' });
      }
    }
  }

  private syncIce(count: number, animate: boolean): void {
    const key = iceCubeArt(this.layout).key;
    const H = this.bodyH;
    while (this.iceCount < count) {
      const [fx, fy, rot] = ICE_SLOTS[this.iceCount % ICE_SLOTS.length];
      const ty = -H * fy;
      const tx = this.halfAt(fy) * fx;
      const img = this.scene.add.image(tx, ty, key).setAngle(rot);
      this.iceLayer.add(img);
      if (animate) {
        img.y = -H - 60;
        this.scene.tweens.add({ targets: img, y: ty, duration: 380, delay: (this.iceCount % 3) * 60, ease: 'Bounce.easeOut' });
      }
      this.iceCount++;
    }
  }

  private syncToppings(cup: CupState, animate: boolean): void {
    // Mỗi muỗng = 4 hạt, xếp từ đáy lên
    const pieces: string[] = [];
    for (const t of cup.toppings) for (let i = 0; i < t.scoops * 4; i++) pieces.push(t.id);
    const H = this.bodyH;
    const size = pieceArt(this.layout, 'x').w;
    const perRow = Math.max(3, Math.floor((this.halfAt(0) * 2 - 8) / (size * 0.9)));
    while (this.toppingCount < pieces.length) {
      const i = this.toppingCount;
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const t = row * 0.09 + 0.04;
      const span = this.halfAt(t) * 2 - size;
      const x = -span / 2 + (span * col) / Math.max(1, perRow - 1) + (row % 2 ? size * 0.3 : 0);
      const y = -size * 0.5 - row * size * 0.75;
      const img = this.scene.add.image(x, y, pieceArt(this.layout, pieces[i]).key).setAngle((i * 37) % 40 - 20);
      this.toppingLayer.add(img);
      if (animate) {
        img.y = -H - 40;
        this.scene.tweens.add({ targets: img, y, duration: 420, delay: (i % 4) * 50, ease: 'Bounce.easeOut' });
      }
      this.toppingCount++;
    }
  }

  private drawOverlay(cup: CupState, blinkGreen: boolean): void {
    const g = this.overlay;
    const H = this.bodyH;
    const size = SIZES[cup.size];
    g.clear();
    // Vạch xanh: thanh dọc bên phải + hai vạch ngang
    const alpha = blinkGreen ? 0.35 : 1;
    const gx = this.halfAt(1) + 8;
    g.fillStyle(0x58b368, alpha);
    g.fillRoundedRect(gx, -size.greenMax * H, 14, (size.greenMax - size.greenMin) * H, 6);
    g.lineStyle(2, hex(PALETTE.outline), alpha);
    g.strokeRoundedRect(gx, -size.greenMax * H, 14, (size.greenMax - size.greenMin) * H, 6);
    g.lineStyle(4, 0x58b368, alpha * 0.9);
    for (const t of [size.greenMin, size.greenMax]) g.lineBetween(-this.halfAt(t) + 4, -t * H, this.halfAt(t) + 8, -t * H);
    // Ly hỏng: phủ đỏ + vũng trà tràn ra bàn
    this.ruinedText.setVisible(cup.ruined);
    if (cup.ruined) {
      g.fillStyle(hex(PALETTE.danger), 0.45);
      g.fillPoints(this.band(0, 1), true);
      g.fillStyle(hex(cup.tea ? getTea(cup.tea).color : PALETTE.danger), 0.85);
      g.fillEllipse(-this.halfAt(0) - 14, -4, 70, 18);
      g.fillEllipse(this.halfAt(0) + 18, -2, 56, 14);
    }
  }

  destroy(fromScene?: boolean): void {
    this.hit.destroy();
    super.destroy(fromScene);
  }
}
