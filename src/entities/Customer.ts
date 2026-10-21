// Khách ở quầy: ghép từ lớp nền (tóc sau + thân + đầu), lớp mặt (đổi biểu cảm, chớp mắt), lớp tóc mái + phụ kiện.
import Phaser from 'phaser';
import { CHAR_W, FACE_BOX, type CharacterDef, type Expression } from '../art/characters';
import { CHARACTERS } from '../config/characters';
import { PALETTE } from '../config/palette';
import type { Customer as CustomerData } from '../core/types';
import type { Rect, ShopLayout } from '../layout';
import { characterBaseArt, characterFaceArt, characterFrontArt, characterSize } from '../scenes/artCatalog';
import { label } from './draw';

export type Mood = Expression;

/** Một nhân vật ghép lớp, đứng với chân (mép dưới) ở đáy `rect`. Dùng cho cả khách và nhân viên. */
export class Character extends Phaser.GameObjects.Container {
  protected face: Phaser.GameObjects.Image;
  protected figure: Phaser.GameObjects.Container;
  private def: CharacterDef;
  private layout: ShopLayout;
  private rect: Rect;
  private mood: Mood = 'normal';
  private blinking = false;
  private nextBlink = 0;

  constructor(scene: Phaser.Scene, L: ShopLayout, rect: Rect, def: CharacterDef) {
    super(scene, rect.x + rect.w / 2, rect.y + rect.h);
    this.def = def;
    this.layout = L;
    this.rect = rect;
    const size = characterSize(rect);
    const s = size.w / CHAR_W;
    // Toạ độ trong container: gốc ở giữa mép dưới
    const base = scene.add.image(0, 0, characterBaseArt(L, rect, def.id).key).setOrigin(0.5, 1);
    this.face = scene.add
      .image(-size.w / 2 + FACE_BOX.x * s, -size.h + FACE_BOX.y * s, characterFaceArt(L, rect, def.id, 'normal', false).key)
      .setOrigin(0, 0);
    const front = scene.add.image(0, 0, characterFrontArt(L, rect, def.id).key).setOrigin(0.5, 1);
    this.figure = scene.add.container(0, 0, [base, this.face, front]);
    this.add(this.figure);
    scene.add.existing(this);
    this.nextBlink = scene.time.now + 1000 + Math.random() * 2000;
  }

  get characterHeight(): number {
    return characterSize(this.rect).h;
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    this.updateFace();
  }

  private updateFace(): void {
    this.face.setTexture(characterFaceArt(this.layout, this.rect, this.def.id, this.mood, this.blinking).key);
  }

  /** Nhún nhẹ và chớp mắt. Gọi mỗi khung hình. */
  idle(time: number, reducedMotion: boolean): void {
    if (!reducedMotion) {
      this.figure.scaleY = 1 + Math.sin(time / 420) * 0.012;
      this.figure.y = Math.sin(time / 420) * 1.5;
    }
    if (time >= this.nextBlink) {
      this.blinking = !this.blinking;
      this.updateFace();
      this.nextBlink = time + (this.blinking ? 130 : 2200 + Math.random() * 2600);
    }
  }
}

export class Customer extends Character {
  readonly customerId: string;

  constructor(scene: Phaser.Scene, L: ShopLayout, data: CustomerData, textScale: number) {
    const def = CHARACTERS[data.look % CHARACTERS.length];
    super(scene, L, L.customer, def);
    this.customerId = data.id;
    // Bảng tên dưới chân
    const w = Math.min(L.customer.w, 70 + data.name.length * 15 * textScale);
    this.add(label(scene, 0, -12 * textScale, w, 44 * textScale, data.name, textScale, PALETTE.white));
  }

  /** Đi vào từ bên trái. */
  enter(reducedMotion: boolean): void {
    if (reducedMotion) return;
    const targetX = this.x;
    this.x = targetX - 320;
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, x: targetX, alpha: 1, duration: 520, ease: 'Back.easeOut' });
  }

  /** Đi ra rồi tự hủy. Vui thì nhảy lên một cái trước khi đi. */
  leave(happy: boolean, reducedMotion: boolean): void {
    this.scene.tweens.killTweensOf(this);
    if (reducedMotion) {
      this.destroy();
      return;
    }
    if (happy) this.scene.tweens.add({ targets: this, y: this.y - 26, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: this,
      x: this.x - 340,
      alpha: 0,
      duration: 480,
      delay: 650,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}
