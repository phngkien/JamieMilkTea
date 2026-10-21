// Điểm khởi động: đọc bản lưu, tạo logic (LocalAdapter), lớp DOM overlay và game Phaser.
// Vào phòng chơi chung thì đổi sang FirebaseAdapter; rời phòng thì quay lại LocalAdapter.
import Phaser from 'phaser';
import './style.css';
import { Sfx } from './audio/Sfx';
import { PALETTE } from './config/palette';
import { SETTINGS_TEXT, fill } from './config/strings';
import { startDay } from './core/day';
import { createShopState } from './core/reducer';
import type { GameEvent, ShopState } from './core/types';
import { chooseLayout, type ShopLayout } from './layout';
import { LocalAdapter } from './net/LocalAdapter';
import type { NetAdapter } from './net/NetAdapter';
import { SaveRepository } from './save/SaveRepository';
import { createSave, defaultSettings, restoreShop, type Settings } from './save/schema';
import { BootScene } from './scenes/BootScene';
import { ShopScene } from './scenes/ShopScene';
import { Overlay } from './ui/overlay';
import { RoomController } from './ui/roomController';

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
  let adapter: NetAdapter = new LocalAdapter(initial);
  let unsubSave: (() => void) | null = null;

  const sfx = new Sfx(settings.muted, settings.musicOn);
  // Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên
  const unlockAudio = () => sfx.unlock();
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });

  /**
   * Chỉ lưu tiệm của MÌNH: chơi một mình, hoặc mình là chủ tiệm của phòng đang chơi.
   * Vào tiệm của bạn thì không ghi đè tiến trình tiệm của mình.
   */
  let resetting = false;
  const ownsShop = () =>
    adapter.mode === 'solo' ||
    ('getRoomInfo' in adapter && (adapter as { getRoomInfo: () => { ownerUid: string } }).getRoomInfo().ownerUid === adapter.localId);
  const persist = () => {
    if (resetting) return;
    if (ownsShop()) void repo.save(createSave(adapter.getState(), settings));
    else void repo.load().then((s) => s && repo.save({ ...s, settings: { ...settings }, updatedAt: Date.now() }));
  };
  const watchSaves = () => {
    unsubSave?.();
    unsubSave = adapter.subscribe((_state, events) => {
      if (events.some((e) => SAVE_EVENTS.has(e.type))) persist();
    });
  };
  watchSaves();
  // Lưu khi ẩn tab / đóng trang
  document.addEventListener('visibilitychange', () => {
    const hidden = document.visibilityState === 'hidden';
    if (hidden) persist();
    sfx.suspend(hidden);
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

  // Giảm chuyển động: theo cài đặt trong game hoặc cài đặt của máy
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  game.registry.set('adapter', adapter);
  game.registry.set('overlay', overlay);
  game.registry.set('layout', layout);
  game.registry.set('tutorialDone', settings.tutorialDone);
  game.registry.set('tutorialTarget', null);
  game.registry.set('reducedMotion', settings.reducedMotion || prefersReduced);
  game.registry.set('sfx', sfx);
  document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion || prefersReduced);
  // Hướng dẫn xong / bỏ qua thì lưu lại để lần sau không hiện nữa
  game.registry.events.on('changedata-tutorialDone', (_parent: unknown, value: boolean) => {
    settings.tutorialDone = value;
    persist();
  });

  const overlayHooks = {
    onTutorial: () => {
      game.registry.set('tutorialTarget', null);
      game.registry.set('tutorialDone', false);
    },
    getSettings: () => settings,
    onSettings: (change: Partial<Settings>) => {
      Object.assign(settings, change);
      if (change.muted !== undefined) sfx.setMuted(change.muted);
      if (change.musicOn !== undefined) sfx.setMusic(change.musicOn);
      if (change.reducedMotion !== undefined) {
        game.registry.set('reducedMotion', change.reducedMotion || prefersReduced);
        document.documentElement.classList.toggle('reduced-motion', change.reducedMotion || prefersReduced);
      }
      persist();
    },
    sfx,
    onReset: () => {
      resetting = true;
      void repo.clear().then(() => window.location.reload());
    },
  };
  overlay.bind(adapter, overlayHooks);

  /** Đổi adapter (vào / rời phòng) và dựng lại cảnh. */
  const switchAdapter = (next: NetAdapter) => {
    const old = adapter;
    adapter = next;
    game.registry.set('adapter', next);
    overlay.bind(next, overlayHooks);
    watchSaves();
    if (old.mode === 'solo') old.destroy();
    if (game.scene.isActive('Shop')) game.scene.getScene('Shop').scene.restart();
    if (import.meta.env.DEV) Object.assign(window, { jamie: { adapter: next, game } });
  };

  const rooms = new RoomController(overlay, {
    getAdapter: () => adapter,
    switchAdapter,
    shopForRoom: () => {
      // Mang tiệm vào phòng: bắt đầu lại từ lúc mở cửa (ngày đã đóng thì sang ngày mới)
      const s: ShopState = adapter.getState();
      return startDay(s, s.phase === 'closed' ? s.day + 1 : s.day);
    },
    backToSolo: async (roomState) => {
      // Chủ tiệm: giữ tiến trình đã chơi trong phòng. Người khác: quay về tiệm của mình.
      if (roomState) await repo.save(createSave(roomState, settings));
      const mine = await repo.load();
      switchAdapter(new LocalAdapter(mine ? restoreShop(mine) : createShopState(Math.floor(Math.random() * 2 ** 31), 1)));
    },
    getName: () => settings.playerName,
    setName: (name) => {
      settings.playerName = name;
      persist();
    },
  });
  overlay.onInvite = () => rooms.open();

  // Chỉ khi chạy `npm run dev`: mở console trình duyệt gõ `jamie.adapter.getState()` để xem state.
  // Bản build đưa lên mạng không có dòng này.
  if (import.meta.env.DEV) Object.assign(window, { jamie: { adapter, game } });

  // Mở bằng link mời (#join-MÃ) thì vào thẳng màn nhập tên; không thì chào mừng quay lại
  if (!rooms.openFromHash(window.location.hash) && saved) {
    overlay.toast.show(fill(SETTINGS_TEXT.welcomeBack, { day: initial.day }), 'info', 3000);
  }
  window.addEventListener('hashchange', () => rooms.openFromHash(window.location.hash));

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
