// Điểm khởi động: đọc bản lưu, tạo logic (LocalAdapter), lớp DOM overlay và game Phaser.
import Phaser from 'phaser';
import './style.css';
import { PALETTE } from './config/palette';
import { SETTINGS_TEXT, fill } from './config/strings';
import type { GameEvent } from './core/types';
import { createShopState } from './core/reducer';
import { chooseLayout, type ShopLayout } from './layout';
import { LocalAdapter } from './net/LocalAdapter';
import { SaveRepository } from './save/SaveRepository';
import { createSave, defaultSettings, restoreShop, type Settings } from './save/schema';
import { BootScene } from './scenes/BootScene';
import { ShopScene } from './scenes/ShopScene';
import { Overlay } from './ui/overlay';

/** Các sự kiện làm game tự lưu (CLAUDE.md mục 10). */
const SAVE_EVENTS = new Set<GameEvent['type']>(['served', 'restocked', 'unlocked', 'dayEnded', 'dayStarted']);

async function start(): Promise<void> {
  const gameParent = document.getElementById('game')!;
  const overlay = new Overlay(document.getElementById('ui')!);
  const repo = new SaveRepository();

  // Có bản lưu thì chơi tiếp từ lúc mở cửa của ngày đang chơi; không có thì tiệm mới.
  const saved = await repo.load();
  const settings: Settings = saved?.settings ?? defaultSettings();
  const initial = saved ? restoreShop(saved) : createShopState(Math.floor(Math.random() * 2 ** 31), 1);
  const adapter = new LocalAdapter(initial);

  // Đang xóa để chơi lại thì không lưu nữa (nếu không, lúc trang tải lại sẽ ghi đè bản vừa xóa)
  let resetting = false;
  const persist = () => {
    if (!resetting) void repo.save(createSave(adapter.getState(), settings));
  };
  adapter.subscribe((_state, events) => {
    if (events.some((e) => SAVE_EVENTS.has(e.type))) persist();
  });
  // Lưu khi ẩn tab / đóng trang
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('pagehide', persist);

  const measure = (): ShopLayout => chooseLayout(gameParent.clientWidth, gameParent.clientHeight);
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
  game.registry.set('tutorialDone', settings.tutorialDone);
  game.registry.set('tutorialTarget', null);
  // Hướng dẫn xong / bỏ qua thì lưu lại để lần sau không hiện nữa
  game.registry.events.on('changedata-tutorialDone', (_parent: unknown, value: boolean) => {
    settings.tutorialDone = value;
    persist();
  });

  overlay.bind(adapter, {
    onTutorial: () => {
      game.registry.set('tutorialTarget', null);
      game.registry.set('tutorialDone', false);
    },
    onReset: () => {
      resetting = true;
      void repo.clear().then(() => window.location.reload());
    },
  });

  // Chỉ khi chạy `npm run dev`: mở console trình duyệt gõ `jamie.adapter.getState()` để xem state.
  // Bản build đưa lên mạng không có dòng này.
  if (import.meta.env.DEV) Object.assign(window, { jamie: { adapter, game } });

  if (saved) overlay.toast.show(fill(SETTINGS_TEXT.welcomeBack, { day: initial.day }), 'info', 3000);

  const syncOverlay = () => overlay.sync(game.canvas, layout);
  game.scale.on(Phaser.Scale.Events.RESIZE, () => requestAnimationFrame(syncOverlay));
  game.events.once(Phaser.Core.Events.READY, syncOverlay);

  /** Xoay máy / đổi cỡ cửa sổ: chọn lại bố cục, đổi kích thước khung và dựng lại cảnh. */
  const relayout = () => {
    const next = measure();
    if (next.kind !== layout.kind || next.viewHeight !== layout.viewHeight) {
      layout = next;
      game.registry.set('layout', layout);
      game.scale.setGameSize(layout.viewWidth, layout.viewHeight);
      if (game.scene.isActive('Shop')) game.scene.getScene('Shop').scene.restart();
    }
    game.scale.refresh();
    requestAnimationFrame(syncOverlay);
  };

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, 120);
  });
  window.addEventListener('orientationchange', () => window.setTimeout(relayout, 300));

  // Chặn cử chỉ zoom của Safari iOS
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

void start();
