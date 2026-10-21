// Lớp DOM phủ đúng lên vùng canvas: HUD, thanh nút, thông báo, hướng dẫn và các màn Kho / Tổng kết / Cài đặt.
// Kích thước chữ/nút tính theo đơn vị khung (--u).
import { LOW_STOCK_AT, RUSH, STOCK, getStockDef, stockIdOfTea, stockIdOfTopping, type PackSize } from '../config/inventory';
import { getUpgrade } from '../config/upgrades';
import { EMOTE_TEXT, ROOM_TEXT, SETTINGS_TEXT, SHOP_TEXT, STOCK_TEXT, WARDROBE_TEXT, fill } from '../config/strings';
import { getOutfit } from '../config/outfits';
import type { OutfitResult } from '../core/profile';
import type { GameEvent, Profile, ShopState } from '../core/types';
import type { AccountInfo } from '../net/cloud';
import type { ShopLayout } from '../layout';
import type { Sfx } from '../audio/Sfx';
import type { EmoteKind, NetAdapter } from '../net/NetAdapter';
import type { Settings } from '../save/schema';
import { Hud } from './hud';
import { Modal } from './modal';
import { QuickNav, type Section } from './quickNav';
import { renderSettings } from './settingsScreen';
import { renderShopScreen, shopScreenKey, type ShopScreenView } from './shopScreen';
import { renderStockScreen, stockScreenKey, type StockView } from './stockScreen';
import { renderSummary } from './summaryScreen';
import { Toast } from './toast';
import { TutorialCard } from './tutorial';
import { renderWardrobe } from './wardrobeScreen';

export interface OverlayHooks {
  /** Bật lại hướng dẫn. */
  onTutorial: () => void;
  /** Xóa bản lưu và chơi lại từ đầu. */
  onReset: () => void;
  /** Đọc / đổi cài đặt (âm thanh, nhạc, giảm chuyển động) — main lưu lại. */
  getSettings: () => Settings;
  onSettings: (change: Partial<Settings>) => void;
  sfx: Sfx;
  getProfile: () => Profile;
  getAccount: () => AccountInfo | null;
  /** Mình là chủ tiệm đang chơi. */
  isOwner: () => boolean;
  buyOutfit: (id: string) => OutfitResult;
  wearOutfit: (id: string) => OutfitResult;
}

export class Overlay {
  readonly root: HTMLElement;
  readonly hud: Hud;
  readonly nav: QuickNav;
  readonly toast: Toast;
  readonly tutorial: TutorialCard;
  readonly modal: Modal;
  /** Số điểm ảnh CSS cho mỗi đơn vị khung thiết kế. */
  pxPerUnit = 1;
  /** Do scene gán: nhảy tới vùng tương ứng. */
  onJump: (section: Section) => void = () => {};
  /** Do scene gán: bỏ qua hướng dẫn. */
  onSkipTutorial: () => void = () => {};
  /** Do main gán: bấm nút Mời bạn. */
  onInvite: () => void = () => {};
  /** Do main gán: mở màn Tài khoản. */
  onAccount: () => void = () => {};
  private unbind: (() => void) | null = null;
  private clickSoundBound = false;
  private emoteBar: HTMLElement;

  private adapter: NetAdapter | null = null;
  private hooks: OverlayHooks | null = null;
  private stockKey = '';
  private shopKey = '';
  private prevStock: Record<string, number> | null = null;
  /** Đã tự mở màn Chuẩn bị cho buổi sáng nào (runId:ngày) — chỉ tự mở một lần mỗi sáng. */
  private prepShownFor = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = new Hud(
      root.querySelector('#hud')!,
      () => this.openSettings(),
      () => this.openStock(),
      () => this.toggleSound(),
      () => this.onInvite(),
      () => this.openShop(),
    );
    this.nav = new QuickNav(root.querySelector('#quicknav')!, (s) => this.onJump(s), () => this.openStock());
    this.toast = new Toast(root.querySelector('#toast')!);
    this.tutorial = new TutorialCard(root.querySelector('#tutorial')!, () => this.onSkipTutorial());
    this.modal = new Modal(root.querySelector('#modal')!);
    this.emoteBar = root.querySelector('#emotes')!;
    this.emoteBar.innerHTML = (Object.keys(EMOTE_TEXT) as EmoteKind[])
      .map((k) => `<button type="button" data-emote="${k}" class="emote-${k}">${EMOTE_TEXT[k]}</button>`)
      .join('');
    this.emoteBar.addEventListener('click', (e) => {
      const kind = (e.target as HTMLElement).closest<HTMLElement>('[data-emote]')?.dataset.emote as EmoteKind | undefined;
      if (kind) this.adapter?.sendEmote(kind);
    });
    this.setRoomMode(false);
  }

  /** Đang chơi chung: hiện thanh biểu cảm. */
  setRoomMode(on: boolean): void {
    this.emoteBar.hidden = !on;
    if (!on) this.hud.setRoom(null);
  }

  setRoomBadge(code: string): void {
    this.hud.setRoom(code);
  }

  /** Nối overlay với logic game: nghe state để cập nhật HUD, Kho, cảnh báo, tổng kết. */
  bind(adapter: NetAdapter, hooks: OverlayHooks): void {
    // Đổi adapter (vào / rời phòng): bỏ nghe adapter cũ
    this.unbind?.();
    this.adapter = adapter;
    this.hooks = hooks;
    this.prevStock = null;
    this.unbind = adapter.subscribe((state, events) => this.onState(state, events));
    this.onState(adapter.getState(), []);
    this.hud.setSound(!hooks.getSettings().muted);
    if (!this.clickSoundBound) {
      this.clickSoundBound = true;
      // Tiếng "tách" nhẹ khi bấm nút trên giao diện
      this.root.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) this.hooks?.sfx.click();
      });
    }
  }

  private toggleSound(): void {
    if (!this.hooks) return;
    const muted = !this.hooks.getSettings().muted;
    this.hooks.onSettings({ muted });
    this.hud.setSound(!muted);
  }

  private onState(state: ShopState, events: GameEvent[]): void {
    this.hud.update(state);
    for (const e of events) {
      if (e.type === 'upgraded') {
        const def = getUpgrade(e.id);
        if (def) this.toast.show(fill(SHOP_TEXT.bought, { name: def.name }));
      } else if (e.type === 'renamed' && this.modal.current === 'shop') {
        this.toast.show(SHOP_TEXT.renamed);
      }
      if (e.type === 'restocked') {
        const name = getStockDef(e.item).name;
        this.toast.show(
          e.rush
            ? fill(STOCK_TEXT.rushOrdered, { n: e.amount, name, s: RUSH.deliveryMs / 1000 })
            : fill(STOCK_TEXT.restocked, { n: e.amount, name }),
        );
      } else if (e.type === 'delivered') {
        this.toast.show(fill(STOCK_TEXT.delivered, { n: e.amount, name: getStockDef(e.item).name }));
      } else if (e.type === 'shopOpened') {
        if (this.modal.current === 'stock') this.modal.close();
        this.toast.show(STOCK_TEXT.opened, 'info', 2500);
      } else if (e.type === 'unlocked') {
        const id = e.kind === 'tea' ? stockIdOfTea(e.id) : stockIdOfTopping(e.id);
        this.toast.show(fill(STOCK_TEXT.unlocked, { name: getStockDef(id).name }));
      } else if (e.type === 'dayEnded') {
        this.tutorial.hide();
        // Chơi chung: chỉ chủ phòng bấm sang ngày mới, người khác chờ
        const canNext = this.adapter?.isHost ?? true;
        const myTips = this.adapter ? (e.summary.staff[this.adapter.localId]?.tips ?? 0) : 0;
        this.modal.open('summary', renderSummary(e.summary, canNext ? null : ROOM_TEXT.waitNextDay, myTips, this.adapter?.localId ?? ''), (action) => {
          if (action === 'next') {
            this.modal.close();
            this.adapter?.dispatch({ type: 'START_DAY' });
          }
        });
      } else if (e.type === 'dayStarted' && this.modal.current === 'summary') {
        this.modal.close();
      }
    }
    this.checkStockWarnings(state);
    // Buổi sáng: tự mở màn Chuẩn bị (một lần mỗi sáng; đóng rồi thì mở lại bằng nút Kho)
    const morning = `${state.runId}:${state.day}`;
    if (state.phase === 'prep' && this.prepShownFor !== morning && this.modal.current !== 'summary') {
      this.prepShownFor = morning;
      if (this.modal.current !== 'stock') this.openStock();
    }
    if (this.modal.current === 'stock') {
      const view = this.stockView(state);
      const key = view ? stockScreenKey(view) : '';
      if (view && key !== this.stockKey) {
        this.stockKey = key;
        this.modal.update(renderStockScreen(view));
      }
    }
    if (this.modal.current === 'shop') {
      const view = this.shopView();
      const key = view ? shopScreenKey(view) : '';
      if (view && key !== this.shopKey) {
        this.shopKey = key;
        this.modal.update(renderShopScreen(view));
      }
    }
  }

  private shopView(): ShopScreenView | null {
    if (!this.adapter || !this.hooks) return null;
    return {
      state: this.adapter.getState(),
      isOwner: this.hooks.isOwner(),
      canSpend: this.adapter.canSpend(),
      guest: this.hooks.getAccount()?.anonymous ?? true,
      inRoom: this.adapter.mode === 'room',
      profile: this.hooks.getProfile(),
    };
  }

  /** Màn "Tiệm của tôi" (bấm tên tiệm trên HUD). */
  openShop(): void {
    const view = this.shopView();
    if (!view || this.modal.current === 'summary') return;
    this.shopKey = shopScreenKey(view);
    this.modal.open('shop', renderShopScreen(view), (action, data) => {
      const adapter = this.adapter;
      if (!adapter) return;
      if (action === 'close') this.modal.close();
      else if (action === 'buy-upgrade' && data.id) adapter.dispatch({ type: 'BUY_UPGRADE', id: data.id });
      else if (action === 'rename') {
        const input = document.getElementById('shop-name') as HTMLInputElement | null;
        const name = input?.value.trim() ?? '';
        if (name && name !== adapter.getState().shopName) adapter.dispatch({ type: 'RENAME_SHOP', name });
      } else if (action === 'wardrobe') this.openWardrobe();
      else if (action === 'account') this.onAccount();
      else if (action === 'room') this.onInvite();
    });
  }

  /** Tủ đồ: mua / mặc outfit bằng tiền tip. */
  openWardrobe(): void {
    const hooks = this.hooks;
    if (!hooks || this.modal.current === 'summary') return;
    this.modal.open('wardrobe', renderWardrobe(hooks.getProfile()), (action, data) => {
      if (action === 'close') this.modal.close();
      else if ((action === 'buy-outfit' || action === 'wear') && data.id) {
        const r = action === 'buy-outfit' ? hooks.buyOutfit(data.id) : hooks.wearOutfit(data.id);
        if (r.ok && action === 'buy-outfit') this.toast.show(fill(WARDROBE_TEXT.bought, { name: getOutfit(data.id).name }));
        if (!r.ok && r.reason === 'noTips') this.toast.show(WARDROBE_TEXT.noTips, 'warn');
        this.modal.update(renderWardrobe(hooks.getProfile()));
      }
    });
  }

  /** Báo khi một nguyên liệu vừa xuống mức "sắp hết" hoặc vừa hết. Nút Kho có chấm cảnh báo. */
  private checkStockWarnings(state: ShopState): void {
    const prev = this.prevStock;
    this.prevStock = state.stock;
    if (prev === state.stock) return;
    // Cảnh báo "sắp hết / đã hết" chỉ trong giờ bán (đóng cửa bỏ đồ hết hạn thì không báo)
    const selling = state.phase === 'open' || state.phase === 'closing';
    let alert: 'none' | 'low' | 'out' = 'none';
    for (const def of STOCK) {
      const now = state.stock[def.id] ?? 0;
      const before = prev?.[def.id] ?? now;
      if (!this.inUse(state, def.id)) continue;
      if (now === 0) alert = 'out';
      else if (now <= LOW_STOCK_AT && alert === 'none') alert = 'low';
      if (!prev || now >= before || !selling) continue;
      if (now === 0) {
        this.toast.show(fill(STOCK_TEXT.outWarning, { name: def.name }), 'warn', 2500);
        this.hooks?.sfx.ting();
      } else if (now <= LOW_STOCK_AT && before > LOW_STOCK_AT) {
        this.toast.show(fill(STOCK_TEXT.lowWarning, { name: def.name }), 'warn', 2500);
        this.hooks?.sfx.ting();
      }
    }
    this.nav.setStockAlert(alert);
    this.root.dataset.stockAlert = alert;
  }

  /** Nguyên liệu đang dùng được (không tính trà / topping còn khóa). */
  private inUse(state: ShopState, stockId: string): boolean {
    const tea = state.unlockedTeas.some((t) => stockIdOfTea(t) === stockId);
    const topping = state.unlockedToppings.some((t) => stockIdOfTopping(t) === stockId);
    const isTeaOrTopping = stockId.startsWith(stockIdOfTea('')) || stockId.startsWith(stockIdOfTopping(''));
    return !isTeaOrTopping || tea || topping;
  }

  private stockView(state: ShopState): StockView | null {
    const adapter = this.adapter;
    if (!adapter) return null;
    return { state, canSpend: adapter.canSpend(), canOpen: adapter.getOwners().stock === adapter.localId };
  }

  /** Màn Kho (buổi sáng là màn Chuẩn bị, có nút "Mở cửa"). */
  openStock(): void {
    const adapter = this.adapter;
    if (!adapter || this.modal.current === 'summary') return;
    const view = this.stockView(adapter.getState());
    if (!view) return;
    this.stockKey = stockScreenKey(view);
    this.modal.open('stock', renderStockScreen(view), (action, data) => {
      if (action === 'close') this.modal.close();
      else if (action === 'open') adapter.dispatch({ type: 'OPEN_SHOP' });
      else if (action === 'restock' && data.item) {
        const pack: PackSize = data.pack === 'small' ? 'small' : 'big';
        adapter.dispatch({ type: 'RESTOCK', item: data.item, pack });
      }
      else if (action === 'unlock' && data.id && (data.kind === 'tea' || data.kind === 'topping')) {
        adapter.dispatch({ type: 'UNLOCK_ITEM', kind: data.kind, id: data.id });
      }
    });
  }

  openSettings(step: 0 | 1 | 2 = 0): void {
    if (this.modal.current === 'summary' || !this.hooks) return;
    const hooks = this.hooks;
    this.modal.open('settings', renderSettings(step, hooks.getSettings()), (action) => {
      const s = hooks.getSettings();
      if (action === 'close' || action === 'cancel') this.modal.close();
      else if (action === 'sound' || action === 'music' || action === 'motion') {
        if (action === 'sound') hooks.onSettings({ muted: !s.muted });
        if (action === 'music') hooks.onSettings({ musicOn: !s.musicOn });
        if (action === 'motion') hooks.onSettings({ reducedMotion: !s.reducedMotion });
        this.hud.setSound(!hooks.getSettings().muted);
        this.modal.update(renderSettings(0, hooks.getSettings()));
      }
      else if (action === 'tutorial') {
        this.hooks?.onTutorial();
        this.modal.close();
        this.toast.show(SETTINGS_TEXT.tutorialOn);
      } else if (action === 'reset') this.openSettings(1);
      else if (action === 'confirm1') this.openSettings(2);
      else if (action === 'confirm2') this.hooks?.onReset();
    });
  }

  /** Đặt overlay trùng khít canvas và cập nhật cỡ chữ theo bố cục. */
  sync(canvas: HTMLCanvasElement, layout: ShopLayout): void {
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = (this.root.offsetParent ?? document.body).getBoundingClientRect();
    this.pxPerUnit = canvasRect.width / layout.viewWidth;
    const s = this.root.style;
    s.left = `${canvasRect.left - parentRect.left}px`;
    s.top = `${canvasRect.top - parentRect.top}px`;
    s.width = `${canvasRect.width}px`;
    s.height = `${canvasRect.height}px`;
    s.setProperty('--u', `${this.pxPerUnit * layout.uiScale}px`);
    this.root.dataset.layout = layout.kind;
    this.nav.setVisible(layout.navHeight > 0);
  }
}
