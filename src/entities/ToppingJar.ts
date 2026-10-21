// Một ô trên kệ topping: hũ topping trong khay kim loại. Bị khóa thì xám + ổ khóa.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { ToppingDef } from '../config/toppings';
import type { Rect } from '../layout';
import { bounce, box, drawLock, shake, text } from './draw';
import { Prop } from './Prop';

export class ToppingJar extends Prop {
  readonly topping: ToppingDef;
  readonly locked: boolean;
  private lock: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, rect: Rect, topping: ToppingDef, locked: boolean, textScale: number) {
    super(scene, rect);
    this.topping = topping;
    this.locked = locked;
    const { g } = this;
    const { w, h } = rect;
    const x = this.left;
    const y = this.top;
    // Khay kim loại
    box(g, x, y, w, h, { fill: '#D8D4CF', radius: 14 });
    box(g, x + 8, y + 8, w - 16, h * 0.62, { fill: '#C4BEB8', radius: 10, lineWidth: 2 });
    // Hạt topping (vị trí cố định theo id cho đẹp, không cần random)
    const color = hex(locked ? PALETTE.grey : topping.color);
    const dot = Math.min(w, h) * 0.09;
    const cols = Math.max(3, Math.floor((w - 30) / (dot * 2.2)));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + 20 + dot + c * ((w - 40 - dot * 2) / (cols - 1)) + (r % 2 ? dot * 0.6 : 0);
        const cy = y + 20 + dot + r * dot * 1.6;
        if (cx > x + w - 18) continue;
        g.fillStyle(color, locked ? 0.55 : 1);
        g.fillCircle(cx, cy, dot);
        g.lineStyle(2, hex(PALETTE.outline), locked ? 0.3 : 0.6);
        g.strokeCircle(cx, cy, dot);
      }
    }
    // Tên topping
    this.add(
      text(scene, 0, y + h * 0.83, topping.name, {
        size: Math.min(28, w * 0.13) * textScale + 4,
        title: true,
        wrapWidth: w - 12,
        color: locked ? '#8A7F78' : PALETTE.text,
      }),
    );
    if (locked) {
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(x, y, w, h, 14);
      this.lock = scene.add.graphics();
      drawLock(this.lock, 0, 0, Math.min(w, h) * 0.28);
      this.lock.setPosition(0, y + h * 0.36);
      this.add(this.lock);
    }
  }

  scoop(): void {
    bounce(this.scene, this);
  }

  refuse(): void {
    // Ổ khóa lắc khi chạm vào hũ bị khóa
    if (this.lock) shake(this.scene, this.lock, 10);
    else shake(this.scene, this);
  }
}
