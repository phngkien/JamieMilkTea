// Khung cửa sổ nổi (DOM) dùng chung cho màn Kho, Tổng kết ngày, Cài đặt. Mỗi lúc chỉ mở một màn.

export type ModalName = 'stock' | 'summary' | 'settings' | 'room';

export class Modal {
  private root: HTMLElement;
  private panel: HTMLElement;
  private clickHandler: ((action: string, data: DOMStringMap) => void) | null = null;
  current: ModalName | null = null;
  /** Phân biệt các màn con trong cùng một loại (ví dụ phòng chờ trong 'room'). */
  tag = '';

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = '<div class="modal-panel" role="dialog" aria-modal="true"></div>';
    this.panel = root.querySelector('.modal-panel')!;
    root.hidden = true;
    // Mọi nút trong màn có data-action; bắt chung một chỗ
    this.panel.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!button || button.hasAttribute('disabled')) return;
      this.clickHandler?.(button.dataset.action ?? '', button.dataset);
    });
  }

  open(name: ModalName, html: string, onAction: (action: string, data: DOMStringMap) => void, tag = ''): void {
    this.current = name;
    this.tag = tag;
    this.clickHandler = onAction;
    this.panel.className = `modal-panel modal-${name}`;
    this.panel.innerHTML = html;
    this.root.hidden = false;
    this.panel.scrollTop = 0;
  }

  /** Vẽ lại nội dung nhưng giữ vị trí cuộn trong màn. */
  update(html: string): void {
    const scroll = this.panel.scrollTop;
    this.panel.innerHTML = html;
    this.panel.scrollTop = scroll;
  }

  close(): void {
    this.current = null;
    this.clickHandler = null;
    this.root.hidden = true;
    this.panel.innerHTML = '';
  }
}

/** Thoát ký tự đặc biệt khi chèn chữ vào HTML. */
export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
