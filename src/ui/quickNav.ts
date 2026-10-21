// Thanh nút nhảy nhanh phía dưới: Quầy trà · Pha ly · Topping · Kho.
import { STOCK_TEXT, UI_TEXT } from '../config/strings';

export type Section = 'tea' | 'brew' | 'topping';

export class QuickNav {
  private root: HTMLElement;
  private buttons = new Map<Section, HTMLButtonElement>();
  private stockButton: HTMLButtonElement;

  constructor(root: HTMLElement, onJump: (section: Section) => void, onStock: () => void) {
    this.root = root;
    const items: [Section, string][] = [
      ['tea', UI_TEXT.teaCounter],
      ['brew', UI_TEXT.brewArea],
      ['topping', UI_TEXT.toppingShelf],
    ];
    for (const [section, label] of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => onJump(section));
      root.appendChild(button);
      this.buttons.set(section, button);
    }
    this.stockButton = document.createElement('button');
    this.stockButton.type = 'button';
    this.stockButton.className = 'nav-stock';
    this.stockButton.textContent = STOCK_TEXT.title;
    this.stockButton.addEventListener('click', onStock);
    root.appendChild(this.stockButton);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  /** Làm nổi nút của vùng đang xem. */
  setActive(section: Section): void {
    for (const [key, button] of this.buttons) button.classList.toggle('active', key === section);
  }

  /** Chấm đỏ trên nút Kho khi có nguyên liệu sắp hết / đã hết. */
  setStockAlert(alert: 'none' | 'low' | 'out'): void {
    this.stockButton.dataset.alert = alert;
  }
}
