// Bình trà thủy tinh có vòi. Giữ để rót.
import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import type { TeaDef } from '../config/teas';
import type { Rect } from '../layout';
import { box, drawLock, shake, text } from './draw';
import { Prop } from './Prop';

export class TeaDispenser extends Prop {
  readonly tea: TeaDef;
  readonly locked: boolean;
  private pouring = false;

  constructor(scene: Phaser.Scene, rect: Rect, tea: TeaDef, locked: boolean, textScale: number) {
    super(scene, rect);
    this.tea = tea;
    this.locked = locked;
    const fontSize = Math.min(rect.w * 0.2, 30) * textScale + 4;
    this.add(
      text(scene, 0, this.top + rect.h * 0.5, tea.name, {
        size: fontSize,
        title: true,
        wrapWidth: rect.w * 0.8,
        color: locked ? '#8A7F78' : PALETTE.text,
      }),
    );
    this.draw();
  }

  setPouring(pouring: boolean): void {
    if (this.pouring === pouring) return;
    this.pouring = pouring;
    this.draw();
  }

  wiggle(): void {
    shake(this.scene, this, 8);
  }

  private draw(): void {
    const { g, rect } = this;
    const w = rect.w;
    const h = rect.h;
    const x = this.left;
    const y = this.top;
    g.clear();
    // Nắp
    box(g, x + w * 0.2, y, w * 0.6, h * 0.08, { fill: PALETTE.beige, radius: 8 });
    // Thân bình thủy tinh
    const bodyY = y + h * 0.07;
    const bodyH = h * 0.72;
    box(g, x + w * 0.06, bodyY, w * 0.88, bodyH, { fill: PALETTE.glass, radius: 18 });
    // Nước trà bên trong
    const teaColor = this.locked ? PALETTE.grey : this.tea.color;
    g.fillStyle(hex(teaColor), this.locked ? 0.6 : 0.95);
    g.fillRoundedRect(x + w * 0.06 + 5, bodyY + bodyH * 0.25, w * 0.88 - 10, bodyH * 0.75 - 5, 14);
    // Nhãn tên
    box(g, x + w * 0.12, y + h * 0.36, w * 0.76, h * 0.28, { fill: PALETTE.cream, radius: 8 });
    // Highlight thủy tinh
    g.fillStyle(0xffffff, 0.7);
    g.fillRoundedRect(x + w * 0.14, bodyY + 12, w * 0.07, bodyH * 0.3, 6);
    // Vòi
    const spoutColor = this.pouring ? PALETTE.pink : PALETTE.woodDark;
    box(g, x + w * 0.36, y + h * 0.8, w * 0.28, h * 0.08, { fill: spoutColor, radius: 6 });
    box(g, x + w * 0.44, y + h * 0.87, w * 0.12, h * 0.1, { fill: spoutColor, radius: 4 });
    if (this.locked) drawLock(g, 0, y + h * 0.22, Math.min(w * 0.35, 46));
    if (this.pouring) {
      g.lineStyle(6, hex(PALETTE.pink), 1);
      g.strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 20);
    }
  }
}
