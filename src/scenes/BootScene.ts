// Chờ font tải xong rồi mới vào cảnh tiệm (để chữ trong Phaser hiện đúng font).
import Phaser from 'phaser';

/** Không chờ font quá lâu khi mạng chậm. */
const FONT_TIMEOUT_MS = 3000;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const fonts = Promise.all([
      document.fonts.load('700 40px "Baloo 2"'),
      document.fonts.load('600 40px "Nunito"'),
      document.fonts.load('400 40px "Nunito"'),
    ]);
    const timeout = new Promise((resolve) => window.setTimeout(resolve, FONT_TIMEOUT_MS));
    Promise.race([fonts, timeout])
      .catch(() => undefined)
      .then(() => this.scene.start('Shop'));
  }
}
