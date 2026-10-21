// Điểm khởi động: đọc bản lưu, tạo logic (LocalAdapter), lớp DOM overlay và game Phaser.
// Vào phòng chơi chung thì đổi sang FirebaseAdapter; rời phòng thì quay lại LocalAdapter.
// Dữ liệu người chơi (tiệm, profile, cài đặt) do PlayerStore giữ: lưu trên máy + đồng bộ cloud.
import Phaser from 'phaser';
import './style.css';
import { Sfx } from './audio/Sfx';
import { PALETTE } from './config/palette';
import { ACCOUNT_TEXT, SETTINGS_TEXT, TIP_TEXT, fill } from './config/strings';
import { startDay } from './core/day';
import { formatMoney } from './core/economy';
import { buyOutfit, wearOutfit } from './core/profile';
import { createShopState } from './core/reducer';
import type { GameEvent, Profile, ShopState } from './core/types';
import { chooseLayout, type ShopLayout } from './layout';
import type { FirebaseAdapter } from './net/FirebaseAdapter';
import { LocalAdapter } from './net/LocalAdapter';
import type { NetAdapter } from './net/NetAdapter';
import { PlayerStore } from './save/PlayerStore';
import { SaveRepository } from './save/SaveRepository';
import { createSave, defaultSettings, restoreShop, type Settings, type ShopSave } from './save/schema';
import { BootScene } from './scenes/BootScene';
import { ShopScene } from './scenes/ShopScene';
import { AccountController } from './ui/accountController';
import { Overlay } from './ui/overlay';
import { RoomController } from './ui/roomController';

/** Các sự kiện làm game tự lưu (CLAUDE.md mục 10). */
const SAVE_EVENTS = new Set<GameEvent['type']>([
  'served',
  'restocked',
  'unlocked',
  'upgraded',
  'renamed',
  'dayEnded',
  'dayStarted',
]);

/** Mã lượt chơi mới (mỗi lần mở game / mở phòng / tải tiệm từ cloud). */
const newRunId = () => Math.random().toString(36).slice(2, 10);
const newSeed = () => Math.floor(Math.random() * 2 ** 31);

async function start(): Promise<void> {
  const gameParent = document.getElementById('game')!;
  const overlay = new Overlay(document.getElementById('ui')!);
  const repo = new SaveRepository();

  // Có bản lưu thì chơi tiếp từ lúc mở cửa của ngày đang chơi; không có thì tiệm mới.
  const saved = await repo.load();
  const initial = saved ? restoreShop(saved, newRunId()) : createShopState(newSeed(), 1, newRunId());
  // Gán ngay bên dưới, sau khi có store (cần outfit trong profile)
  let adapter!: NetAdapter;
  let unsubSave: (() => void) | null = null;

  const store = new PlayerStore(repo, saved ?? createSave(initial, defaultSettings()), {
    getAdapter: () => adapter,
    replaceShop: (shop: ShopSave) => {
      if (adapter.mode !== 'solo') return;
      switchAdapter(newLocal(restoreShop({ shop }, newRunId())));
    },
    onProfile: (profile: Profile) => {
      applyOutfit(profile.outfit);
      if (adapter.mode === 'solo') (adapter as LocalAdapter).setName(profile.name);
    },
    onAccount: () => accounts.refresh(),
    notify: (message) =>
      overlay.toast.show(message === 'shopFromCloud' ? ACCOUNT_TEXT.shopFromCloud : ACCOUNT_TEXT.shopConflict, 'info', 3500),
  });
  const settings: Settings = store.settings;

  const newLocal = (state: ShopState) => {
    const local = new LocalAdapter(state);
    local.setOutfit(store.profile.outfit);
    local.setName(store.profile.name);
    return local;
  };
  adapter = newLocal(initial);

  /** Nhân viên của mình mặc outfit mới (chơi một mình hoặc trong phòng). */
  const applyOutfit = (outfit: string) => {
    if (adapter.mode === 'solo') (adapter as LocalAdapter).setOutfit(outfit);
    else void (adapter as FirebaseAdapter).setOutfit(outfit);
  };

  const sfx = new Sfx(settings.muted, settings.musicOn);
  // Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên
  const unlockAudio = () => sfx.unlock();
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });

  const watchSaves = () => {
    unsubSave?.();
    unsubSave = adapter.subscribe((_state, events) => {
      // Tip của mình (đã được chủ phòng xác nhận) cộng vào profile
      const credit = store.credit(events);
      if (credit.gained > 0) overlay.toast.show(fill(TIP_TEXT.gained, { money: formatMoney(credit.gained) }), 'info', 1600);
      if (events.some((e) => SAVE_EVENTS.has(e.type)) || credit.changed) store.save();
    });
  };
  watchSaves();
  // Lưu khi ẩn tab / đóng trang
  document.addEventListener('visibilitychange', () => {
    const hidden = document.visibilityState === 'hidden';
    if (hidden) {
      store.save();
      void store.pushNow();
    }
    sfx.suspend(hidden);
  });
  window.addEventListener('pagehide', () => store.save());
  // Có mạng lại: đăng nhập / đồng bộ
  window.addEventListener('online', () => void store.startCloud());

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
    store.save();
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
      store.save();
    },
    sfx,
    onReset: () => {
      void store.resetShop(createShopState(newSeed(), 1, newRunId())).then(() => window.location.reload());
    },
    getProfile: () => store.profile,
    getAccount: () => store.account,
    isOwner: () => store.ownsShop(),
    buyOutfit: (id: string) => {
      const r = buyOutfit(store.profile, id, Date.now());
      if (r.ok) store.setProfile(r.profile);
      return r;
    },
    wearOutfit: (id: string) => {
      const r = wearOutfit(store.profile, id, Date.now());
      if (r.ok) store.setProfile(r.profile);
      return r;
    },
  };
  overlay.bind(adapter, overlayHooks);

  /** Đổi adapter (vào / rời phòng, tải tiệm từ cloud) và dựng lại cảnh. */
  const switchAdapter = (next: NetAdapter) => {
    const old = adapter;
    adapter = next;
    game.registry.set('adapter', next);
    overlay.bind(next, overlayHooks);
    watchSaves();
    if (old.mode === 'solo') old.destroy();
    if (game.scene.isActive('Shop')) game.scene.getScene('Shop').scene.restart();
    if (import.meta.env.DEV) Object.assign(window, { jamie: { adapter: next, game, store } });
  };

  const rooms = new RoomController(overlay, {
    getAdapter: () => adapter,
    switchAdapter,
    shopForRoom: () => {
      // Mang tiệm vào phòng: bắt đầu lại từ lúc mở cửa (ngày đã đóng thì sang ngày mới), lượt chơi mới
      const s: ShopState = adapter.getState();
      return { ...startDay(s, s.phase === 'closed' ? s.day + 1 : s.day), runId: newRunId() };
    },
    onRoomCreated: (shop, code) => store.attachRoom(shop, code),
    beforeLeave: () => {
      store.save();
      return store.pushNow();
    },
    backToSolo: async (roomState) => {
      // Chủ tiệm: giữ tiến trình đã chơi trong phòng. Người khác: quay về tiệm của mình.
      const mine = store.myShop();
      const state = roomState
        ? { ...roomState, solo: true, runId: newRunId() }
        : mine
          ? restoreShop({ shop: mine }, newRunId())
          : createShopState(newSeed(), 1, newRunId());
      switchAdapter(newLocal(roomState ? startDay(state, state.phase === 'closed' ? state.day + 1 : state.day) : state));
      store.save();
      await store.sync();
    },
    getName: () => store.profile.name,
    setName: (name) => store.setProfile({ ...store.profile, name, updatedAt: Date.now() }),
    getOutfit: () => store.profile.outfit,
    connect: () => store.startCloud(),
  });
  overlay.onInvite = () => rooms.open();

  const accounts = new AccountController(overlay, store, {
    inRoom: () => adapter.mode === 'room',
  });
  overlay.onAccount = () => accounts.open();

  // Chỉ khi chạy `npm run dev`: mở console trình duyệt gõ `jamie.adapter.getState()` để xem state.
  // Bản build đưa lên mạng không có dòng này.
  if (import.meta.env.DEV) Object.assign(window, { jamie: { adapter, game, store } });

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

  // Đăng nhập + đồng bộ cloud sau khi game đã hiện (không chặn lúc mở game, không mạng vẫn chơi được)
  window.setTimeout(() => void store.startCloud(), 1500);
}

void start();
