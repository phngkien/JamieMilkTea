// Điểm khởi động: tạo logic (LocalAdapter), lớp DOM overlay và game Phaser.
import Phaser from 'phaser';
import './style.css';
import { PALETTE } from './config/palette';
import { createShopState } from './core/reducer';
import { chooseLayout, type ShopLayout } from './layout';
import { LocalAdapter } from './net/LocalAdapter';
import { BootScene } from './scenes/BootScene';
import { ShopScene } from './scenes/ShopScene';
import { Overlay } from './ui/overlay';

const gameParent = document.getElementById('game')!;
const overlay = new Overlay(document.getElementById('ui')!);

// Chơi đơn: mỗi lần mở game một seed mới. (Lưu dữ liệu làm ở prompt sau.)
const seed = Math.floor(Math.random() * 2 ** 31);
const adapter = new LocalAdapter(createShopState(seed, 1));

function measure(): ShopLayout {
  return chooseLayout(gameParent.clientWidth, gameParent.clientHeight);
}

let layout = measure();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameParent,
  backgroundColor: PALETTE.cream,
  width: layout.viewWidth,
  height: layout.viewHeight,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  disableContextMenu: true,
  scene: [BootScene, ShopScene],
});

game.registry.set('adapter', adapter);
game.registry.set('overlay', overlay);
game.registry.set('layout', layout);
game.registry.set('tutorialDone', false);

function syncOverlay(): void {
  overlay.sync(game.canvas, layout);
}

game.scale.on(Phaser.Scale.Events.RESIZE, () => requestAnimationFrame(syncOverlay));
game.events.once(Phaser.Core.Events.READY, syncOverlay);

/** Xoay máy / đổi cỡ cửa sổ: chọn lại bố cục, đổi kích thước khung và dựng lại cảnh. */
function relayout(): void {
  const next = measure();
  const changed = next.kind !== layout.kind || next.viewHeight !== layout.viewHeight;
  if (changed) {
    layout = next;
    game.registry.set('layout', layout);
    game.scale.setGameSize(layout.viewWidth, layout.viewHeight);
    if (game.scene.isActive('Shop')) game.scene.getScene('Shop').scene.restart();
  }
  game.scale.refresh();
  requestAnimationFrame(syncOverlay);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(relayout, 120);
});
window.addEventListener('orientationchange', () => window.setTimeout(relayout, 300));

// Chặn cử chỉ zoom của Safari iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());
