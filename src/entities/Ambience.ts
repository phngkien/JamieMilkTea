// Hình động cho không khí tiệm: mây trôi ngoài cửa sổ, dây đèn lấp lánh, hơi nóng bốc lên từ bình trà.
// Tắt hết khi bật "Giảm chuyển động".
import Phaser from 'phaser';
import { lightBulbs, windowGlass } from '../art/background';
import { hex } from '../config/palette';
import type { ShopLayout } from '../layout';
import { cloudArt, steamArt } from '../scenes/artCatalog';

/** Mây trôi hết một vòng cửa sổ trong bao lâu (ms). */
const CLOUD_CYCLE_MS = 26000;
/** Cứ bao lâu lại có một làn hơi nóng (ms). */
const STEAM_EVERY_MS = 2600;

export class Ambience {
  private scene: Phaser.Scene;
  private clouds: Phaser.GameObjects.Image[] = [];
  private glass: { x: number; y: number; w: number; h: number };
  private glow: Phaser.GameObjects.Graphics;
  private bulbs: { x: number; y: number; color: number; phase: number }[];
  private steamSources: { x: number; y: number }[];
  private steamKey: string;
  private nextSteam = 0;

  constructor(scene: Phaser.Scene, L: ShopLayout, steamSources: { x: number; y: number }[], depth: number) {
    this.scene = scene;
    this.glass = windowGlass(L);
    this.steamSources = steamSources;
    this.steamKey = steamArt(L).key;
    // Mây chỉ hiện trong khung kính (mặt nạ hình chữ nhật)
    const maskShape = scene.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(this.glass.x, this.glass.y, this.glass.w, this.glass.h);
    const mask = maskShape.createGeometryMask();
    const cloud = cloudArt(L);
    const scale = Math.min(1, (this.glass.h * 0.5) / cloud.h);
    for (let i = 0; i < 2; i++) {
      const img = scene.add
        .image(0, this.glass.y + this.glass.h * (0.3 + i * 0.32), cloud.key)
        .setScale(scale * (1 - i * 0.25))
        .setMask(mask)
        .setDepth(depth);
      this.clouds.push(img);
    }
    this.glow = scene.add.graphics().setDepth(depth);
    this.bulbs = lightBulbs(L).map((b, i) => ({ x: b.x, y: b.y, color: hex(b.color), phase: i * 1.7 }));
  }

  update(time: number, reducedMotion: boolean): void {
    // Mây: trôi từ trái sang phải rồi quay lại từ đầu
    this.clouds.forEach((c, i) => {
      const t = reducedMotion ? 0.35 + i * 0.3 : ((time / CLOUD_CYCLE_MS) * (1 - i * 0.3) + i * 0.5) % 1;
      c.x = this.glass.x - c.displayWidth / 2 + t * (this.glass.w + c.displayWidth);
    });
    // Đèn: quầng sáng nhấp nháy nhẹ quanh từng bóng
    const g = this.glow;
    g.clear();
    if (!reducedMotion) {
      for (const b of this.bulbs) {
        const a = 0.18 + 0.18 * Math.sin(time / 450 + b.phase);
        g.fillStyle(b.color, a);
        g.fillCircle(b.x, b.y, 15);
        g.fillStyle(0xffffff, a * 0.9);
        g.fillCircle(b.x - 2, b.y - 3, 4);
      }
    }
    // Hơi nóng bốc lên từ nắp một bình trà
    if (!reducedMotion && this.steamSources.length > 0 && time >= this.nextSteam) {
      this.nextSteam = time + STEAM_EVERY_MS;
      const src = this.steamSources[Math.floor(Math.random() * this.steamSources.length)];
      const puff = this.scene.add.image(src.x, src.y, this.steamKey).setAlpha(0).setDepth(this.glow.depth);
      this.scene.tweens.add({
        targets: puff,
        y: src.y - 70,
        alpha: { from: 0.8, to: 0 },
        scaleX: { from: 0.7, to: 1.1 },
        duration: 1800,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }
}
