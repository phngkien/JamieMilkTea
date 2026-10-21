// Bong bóng gọi món: hình ly minh họa, câu gọi món, tab Ly 1/Ly 2, thanh kiên nhẫn.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { UI_TEXT, fill } from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import { buildCupText, buildOrderText } from '../core/orders';
import type { CupSpec, Customer } from '../core/types';
import type { Rect } from '../layout';
import { box, drawBar, patienceColor, text } from './draw';

export class OrderBubble extends Phaser.GameObjects.Container {
  private rect: Rect;
  private textScale: number;
  private bg: Phaser.GameObjects.Graphics;
  private cupArt: Phaser.GameObjects.Graphics;
  private bar: Phaser.GameObjects.Graphics;
  private message: Phaser.GameObjects.Text;
  private tabs: Phaser.GameObjects.Container;
  private customer: Customer | null = null;
  private servedKey = '';
  private tab = 0;
  private lastPatience = -1;
  private tabZones: Phaser.GameObjects.Zone[] = [];

  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect.x, rect.y);
    this.rect = rect;
    this.textScale = textScale;
    const { w, h } = rect;
    this.bg = scene.add.graphics();
    box(this.bg, 0, 0, w, h, { fill: PALETTE.white, radius: 28 });
    // Đuôi bong bóng chỉ về khách
    this.bg.fillStyle(0xffffff, 1);
    this.bg.fillTriangle(2, h * 0.45, -26, h * 0.55, 2, h * 0.62);
    this.bg.lineStyle(3, hex(PALETTE.outline), 1);
    this.bg.lineBetween(0, h * 0.45, -26, h * 0.55);
    this.bg.lineBetween(-26, h * 0.55, 0, h * 0.62);
    this.cupArt = scene.add.graphics();
    this.tabs = scene.add.container(0, 0);
    const artW = this.artWidth();
    this.message = text(scene, artW + 10, 24, '', {
      size: 34 * textScale,
      align: 'left',
      originX: 0,
      originY: 0,
      wrapWidth: w - artW - 30,
    });
    const patienceLabel = text(scene, artW + 10, h - 50 * textScale, UI_TEXT.patience, {
      size: 24 * textScale,
      title: true,
      originX: 0,
    });
    this.bar = scene.add.graphics();
    this.add([this.bg, this.cupArt, this.tabs, this.message, patienceLabel, this.bar]);
    scene.add.existing(this);
    this.setCustomer(null);
  }

  private clearTabs(): void {
    this.tabs.removeAll(true);
    for (const zone of this.tabZones) zone.destroy();
    this.tabZones = [];
  }

  destroy(fromScene?: boolean): void {
    for (const zone of this.tabZones) zone.destroy();
    this.tabZones = [];
    super.destroy(fromScene);
  }

  private artWidth(): number {
    return Math.min(150, this.rect.w * 0.22);
  }

  setCustomer(customer: Customer | null): void {
    const servedKey = customer ? customer.order.served.join(',') : '';
    if (customer?.id === this.customer?.id && servedKey === this.servedKey) return;
    if (customer?.id !== this.customer?.id) this.tab = 0;
    this.customer = customer;
    this.servedKey = servedKey;
    this.lastPatience = -1;
    if (!customer) {
      this.message.setText(UI_TEXT.waitingCustomer);
      this.cupArt.clear();
      this.clearTabs();
      this.bar.clear();
      this.setAlpha(0.6);
      return;
    }
    this.setAlpha(1);
    // Mặc định chọn ly đầu tiên chưa giao
    const firstOpen = customer.order.served.findIndex((s) => s === null);
    if (customer.order.served[this.tab] !== null && firstOpen >= 0) this.tab = firstOpen;
    this.redraw();
  }

  private redraw(): void {
    const customer = this.customer;
    if (!customer) return;
    const cups = customer.order.cups;
    this.clearTabs();
    let textTop = 24;
    if (cups.length > 1) {
      // Tab Ly 1 / Ly 2
      cups.forEach((_, i) => {
        const tabW = 110 * this.textScale;
        const tx = this.artWidth() + 10 + i * (tabW + 10);
        const g = this.scene.add.graphics();
        const active = i === this.tab;
        const done = customer.order.served[i] !== null;
        box(g, tx, 18, tabW, 44 * this.textScale, {
          fill: done ? PALETTE.mint : active ? PALETTE.pink : PALETTE.pinkLight,
          radius: 12,
          lineWidth: 2,
        });
        const label = text(this.scene, tx + tabW / 2, 18 + 22 * this.textScale, fill(UI_TEXT.cupTab, { k: i + 1 }), {
          size: 26 * this.textScale,
          title: true,
          color: active ? PALETTE.white : PALETTE.text,
        });
        const zone = this.scene.add
          .zone(this.rect.x + tx + tabW / 2, this.rect.y + 18 + 22 * this.textScale, tabW, 60)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this.tab = i;
          this.redraw();
        });
        this.tabs.add([g, label]);
        // Zone đặt ngoài container để toạ độ chạm khớp với thế giới
        this.tabZones.push(zone);
      });
      textTop = 24 + 56 * this.textScale;
      this.message.setText(buildCupText(cups[this.tab], this.tab + 1));
    } else {
      this.message.setText(buildOrderText(customer));
    }
    this.message.setY(textTop);
    this.drawCupArt(cups[this.tab]);
  }

  /** Hình ly minh họa bên trái bong bóng. */
  private drawCupArt(spec: CupSpec): void {
    const g = this.cupArt;
    g.clear();
    const artW = this.artWidth();
    const h = this.rect.h * 0.55;
    const cx = artW / 2 + 12;
    const bottom = this.rect.h * 0.2 + h;
    const topW = artW * 0.62 * (spec.size === 'L' ? 1.1 : 0.95);
    const botW = topW * 0.76;
    const pts = (t: number) => {
      const wt = botW + (topW - botW) * t;
      return [
        new Phaser.Math.Vector2(cx - botW / 2, bottom),
        new Phaser.Math.Vector2(cx + botW / 2, bottom),
        new Phaser.Math.Vector2(cx + wt / 2, bottom - h * t),
        new Phaser.Math.Vector2(cx - wt / 2, bottom - h * t),
      ];
    };
    g.fillStyle(0xffffff, 1);
    g.fillPoints(pts(1), true);
    g.fillStyle(hex(getTea(spec.tea).color), 0.9);
    g.fillPoints(pts(0.8), true);
    let i = 0;
    for (const t of spec.toppings) {
      g.fillStyle(hex(getTopping(t.id).color), 1);
      for (let k = 0; k < t.scoops * 3; k++, i++) {
        g.fillCircle(cx - botW / 2 + 10 + (i % 5) * ((botW - 20) / 4), bottom - 9 - Math.floor(i / 5) * 12, 6);
      }
    }
    g.lineStyle(3, hex(PALETTE.outline), 1);
    g.strokePoints(pts(1), true);
    // Ống hút
    g.lineStyle(7, hex(PALETTE.pink), 1);
    g.lineBetween(cx + 6, bottom - h * 0.6, cx + 18, bottom - h - 26);
    // Size
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx + topW * 0.38, bottom - 22, 18);
    g.lineStyle(2, hex(PALETTE.outline), 1);
    g.strokeCircle(cx + topW * 0.38, bottom - 22, 18);
    this.tabs.add(
      text(this.scene, cx + topW * 0.38, bottom - 22, spec.size, { size: 24 * this.textScale, title: true }),
    );
  }

  setPatience(p: number): void {
    if (!this.customer) return;
    const rounded = Math.round(p * 200) / 200;
    if (rounded === this.lastPatience) return;
    this.lastPatience = rounded;
    const artW = this.artWidth();
    const barX = artW + 10 + 170 * this.textScale;
    const barH = 30 * this.textScale;
    this.bar.clear();
    drawBar(this.bar, barX, this.rect.h - 50 * this.textScale - barH / 2, this.rect.w - barX - 24, barH, p, patienceColor(p));
  }
}
