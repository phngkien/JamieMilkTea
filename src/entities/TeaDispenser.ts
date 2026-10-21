// Bình trà thủy tinh có vòi. Giữ để rót.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { TeaDef } from '../config/teas';
import type { Rect, ShopLayout } from '../layout';
import { dispenserArt, lockArt } from '../scenes/artCatalog';
import { fitText, shake, text } from './draw';
import { Prop } from './Prop';

export class TeaDispenser extends Prop {
  readonly tea: TeaDef;
  readonly locked: boolean;
  /** Vị trí miệng vòi (toạ độ thế giới) — dòng trà chảy ra từ đây. */
  readonly spout: { x: number; y: number };
  /** Đỉnh nắp bình (toạ độ thế giới) — hơi nóng bốc lên từ đây. */
  readonly lidTop: { x: number; y: number };
  private glow: Phaser.GameObjects.Graphics;
  private pouring = false;

  constructor(scene: Phaser.Scene, L: ShopLayout, rect: Rect, tea: TeaDef, locked: boolean, textScale: number) {
    super(scene, rect);
    this.tea = tea;
    this.locked = locked;
    const a = dispenserArt(L, rect, tea.id, locked);
    // Bình đứng sát đáy ô
    const imgTop = rect.h / 2 - a.h;
    this.glow = scene.add.graphics();
    this.add(this.glow);
    this.add(scene.add.image(0, imgTop, a.key).setOrigin(0.5, 0));
    // Tên trà viết lên nhãn gỗ của bình (nhãn ở khoảng 37–56% chiều cao hình)
    const s = a.h / 300;
    const name = text(scene, 0, imgTop + 140 * s, tea.name, {
      size: 32 * textScale,
      title: true,
      color: locked ? '#9A8F87' : PALETTE.text,
    });
    this.add(fitText(name, 80 * s, 14, false));
    this.spout = { x: this.x, y: this.y + imgTop + 286 * s };
    this.lidTop = { x: this.x, y: this.y + imgTop };
    if (locked) {
      const lock = scene.add.image(0, imgTop + 70 * s, lockArt(L).key);
      lock.setDisplaySize(a.w * 0.36, a.w * 0.38);
      this.add(lock);
    }
  }

  setPouring(pouring: boolean): void {
    if (this.pouring === pouring) return;
    this.pouring = pouring;
    this.glow.clear();
    if (pouring) {
      this.glow.lineStyle(6, hex(PALETTE.pink), 1);
      this.glow.strokeRoundedRect(-this.rect.w / 2 - 2, -this.rect.h / 2 - 2, this.rect.w + 4, this.rect.h + 4, 22);
    }
  }

  wiggle(): void {
    shake(this.scene, this, 8);
  }
}
