// Thanh nút nhảy nhanh phía dưới: Quầy trà · Pha ly · Topping (nút Kho làm ở Prompt 2).
import { UI_TEXT } from '../config/strings';

export type Section = 'tea' | 'brew' | 'topping';

export class QuickNav {
  private root: HTMLElement;
  private buttons = new Map<Section, HTMLButtonElement>();

  constructor(root: HTMLElement, onJump: (section: Section) => void) {
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
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  /** Làm nổi nút của vùng đang xem. */
  setActive(section: Section): void {
    for (const [key, button] of this.buttons) button.classList.toggle('active', key === section);
  }
}
