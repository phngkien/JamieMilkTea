// Lớp DOM phủ đúng lên vùng canvas: HUD, thanh nút, thông báo, hướng dẫn và các màn Kho / Tổng kết / Cài đặt.
// Kích thước chữ/nút tính theo đơn vị khung (--u).
import { LOW_STOCK_AT, STOCK, getStockDef, stockIdOfTea, stockIdOfTopping } from '../config/inventory';
import { SETTINGS_TEXT, STOCK_TEXT, fill } from '../config/strings';
import type { GameEvent, ShopState } from '../core/types';
import type { ShopLayout } from '../layout';
import type { NetAdapter } from '../net/NetAdapter';
import { Hud } from './hud';
import { Modal } from './modal';
import { QuickNav, type Section } from './quickNav';
import { renderSettings } from './settingsScreen';
import { renderStockScreen, stockScreenKey } from './stockScreen';
import { renderSummary } from './summaryScreen';
import { Toast } from './toast';
import { TutorialCard } from './tutorial';

export interface OverlayHooks {
  /** Bật lại hướng dẫn. */
  onTutorial: () => void;
  /** Xóa bản lưu và chơi lại từ đầu. */
  onReset: () => void;
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

  private adapter: NetAdapter | null = null;
  private hooks: OverlayHooks | null = null;
  private stockKey = '';
  private prevStock: Record<string, number> | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = new Hud(root.querySelector('#hud')!, () => this.openSettings(), () => this.openStock());
    this.nav = new QuickNav(root.querySelector('#quicknav')!, (s) => this.onJump(s), () => this.openStock());
    this.toast = new Toast(root.querySelector('#toast')!);
    this.tutorial = new TutorialCard(root.querySelector('#tutorial')!, () => this.onSkipTutorial());
    this.modal = new Modal(root.querySelector('#modal')!);
  }

  /** Nối overlay với logic game: nghe state để cập nhật HUD, Kho, cảnh báo, tổng kết. */
  bind(adapter: NetAdapter, hooks: OverlayHooks): void {
    this.adapter = adapter;
    this.hooks = hooks;
    adapter.subscribe((state, events) => this.onState(state, events));
    this.onState(adapter.getState(), []);
  }

  private onState(state: ShopState, events: GameEvent[]): void {
    this.hud.update(state);
    for (const e of events) {
      if (e.type === 'restocked') {
        this.toast.show(fill(STOCK_TEXT.restocked, { n: e.amount, name: getStockDef(e.item).name }));
      } else if (e.type === 'unlocked') {
        const id = e.kind === 'tea' ? stockIdOfTea(e.id) : stockIdOfTopping(e.id);
        this.toast.show(fill(STOCK_TEXT.unlocked, { name: getStockDef(id).name }));
      } else if (e.type === 'dayEnded') {
        this.tutorial.hide();
        this.modal.open('summary', renderSummary(e.summary), (action) => {
          if (action === 'next') {
            this.modal.close();
            this.adapter?.dispatch({ type: 'START_DAY' });
          }
        });
      }
    }
    this.checkStockWarnings(state);
    if (this.modal.current === 'stock') {
      const key = stockScreenKey(state);
      if (key !== this.stockKey) {
        this.stockKey = key;
        this.modal.update(renderStockScreen(state));
      }
    }
  }

  /** Báo khi một nguyên liệu vừa xuống mức "sắp hết" hoặc vừa hết. Nút Kho có chấm cảnh báo. */
  private checkStockWarnings(state: ShopState): void {
    const prev = this.prevStock;
    this.prevStock = state.stock;
    if (prev === state.stock) return;
    let alert: 'none' | 'low' | 'out' = 'none';
    for (const def of STOCK) {
      const now = state.stock[def.id] ?? 0;
      const before = prev?.[def.id] ?? now;
      if (!this.inUse(state, def.id)) continue;
      if (now === 0) alert = 'out';
      else if (now <= LOW_STOCK_AT && alert === 'none') alert = 'low';
      if (!prev || now >= before) continue;
      if (now === 0) this.toast.show(fill(STOCK_TEXT.outWarning, { name: def.name }), 'warn', 2500);
      else if (now <= LOW_STOCK_AT && before > LOW_STOCK_AT) {
        this.toast.show(fill(STOCK_TEXT.lowWarning, { name: def.name }), 'warn', 2500);
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

  openStock(): void {
    const adapter = this.adapter;
    if (!adapter || this.modal.current === 'summary') return;
    const state = adapter.getState();
    this.stockKey = stockScreenKey(state);
    this.modal.open('stock', renderStockScreen(state), (action, data) => {
      if (action === 'close') this.modal.close();
      else if (action === 'restock' && data.item) adapter.dispatch({ type: 'RESTOCK', item: data.item });
      else if (action === 'unlock' && data.id && (data.kind === 'tea' || data.kind === 'topping')) {
        adapter.dispatch({ type: 'UNLOCK_ITEM', kind: data.kind, id: data.id });
      }
    });
  }

  openSettings(step: 0 | 1 | 2 = 0): void {
    if (this.modal.current === 'summary') return;
    this.modal.open('settings', renderSettings(step), (action) => {
      if (action === 'close' || action === 'cancel') this.modal.close();
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
