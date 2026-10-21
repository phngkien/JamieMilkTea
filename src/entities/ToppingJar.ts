// Một ô trên kệ topping: khay inox chứa topping. Bị khóa thì xám + ổ khóa.
import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import type { ToppingDef } from '../config/toppings';
import type { Rect, ShopLayout } from '../layout';
import { lockArt, trayArt, trayLevel } from '../scenes/artCatalog';
import { bounce, fitText, shake, text } from './draw';
import { Prop } from './Prop';

export class ToppingJar extends Prop {
  readonly topping: ToppingDef;
  readonly locked: boolean;
  private tray: Phaser.GameObjects.Image;
  private lock: Phaser.GameObjects.Image | null = null;
  private layout: ShopLayout;
  private level: 0 | 1 | 2 | null = null;

  constructor(scene: Phaser.Scene, L: ShopLayout, rect: Rect, topping: ToppingDef, locked: boolean, textScale: number) {
    super(scene, rect);
    this.topping = topping;
    this.locked = locked;
    this.layout = L;
    const { w, h } = rect;
    const a = trayArt(L, rect, topping.id, locked, 0);
    this.tray = scene.add.image(0, -h / 2, a.key).setOrigin(0.5, 0);
    this.add(this.tray);
    const name = text(scene, 0, -h / 2 + a.h + (h - a.h) / 2, topping.name, {
      size: 30 * textScale,
      title: true,
      color: locked ? '#9A8F87' : PALETTE.text,
    });
    this.add(fitText(name, w - 10));
    if (locked) {
      this.lock = scene.add.image(0, -h / 2 + a.h * 0.52, lockArt(L).key);
      this.add(this.lock);
    }
  }

  /** Khay đầy / vơi theo số tồn. */
  setLevel(stock: number): void {
    if (this.locked) return;
    const level = trayLevel(stock);
    if (level === this.level) return;
    this.level = level;
    this.tray.setTexture(trayArt(this.layout, this.rect, this.topping.id, false, level).key);
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
