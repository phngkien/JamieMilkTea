// Nút "Giao": giao ly đã ép nắp cho khách đang ở quầy.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { UI_TEXT } from '../config/strings';
import type { Rect } from '../layout';
import { box, text } from './draw';
import { Prop } from './Prop';

export class ServeButton extends Prop {
  private enabled = true;

  constructor(scene: Phaser.Scene, rect: Rect, textScale: number) {
    super(scene, rect);
    const { w, h } = rect;
    const pad = Math.min(w, h) * 0.12;
    box(this.g, this.left + pad / 2, this.top + pad, w - pad, h - pad * 2, {
      fill: PALETTE.pink,
      radius: (h - pad * 2) / 2.5,
      lineWidth: 4,
    });
    this.add(text(scene, 0, 0, UI_TEXT.serve, { size: 52 * textScale, title: true, color: PALETTE.white }));
    this.setEnabled(false);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.45);
  }
}
