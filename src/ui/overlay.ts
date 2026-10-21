// Lớp DOM phủ đúng lên vùng canvas. Kích thước chữ/nút tính theo đơn vị khung (--u).
import type { ShopLayout } from '../layout';
import { Hud } from './hud';
import { QuickNav, type Section } from './quickNav';
import { Toast } from './toast';
import { TutorialCard } from './tutorial';

export class Overlay {
  readonly root: HTMLElement;
  readonly hud: Hud;
  readonly nav: QuickNav;
  readonly toast: Toast;
  readonly tutorial: TutorialCard;
  /** Số điểm ảnh CSS cho mỗi đơn vị khung thiết kế. */
  pxPerUnit = 1;
  /** Do scene gán: nhảy tới vùng tương ứng. */
  onJump: (section: Section) => void = () => {};
  /** Do scene gán: bỏ qua hướng dẫn. */
  onSkipTutorial: () => void = () => {};

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = new Hud(root.querySelector('#hud')!);
    this.nav = new QuickNav(root.querySelector('#quicknav')!, (s) => this.onJump(s));
    this.toast = new Toast(root.querySelector('#toast')!);
    this.tutorial = new TutorialCard(root.querySelector('#tutorial')!, () => this.onSkipTutorial());
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
