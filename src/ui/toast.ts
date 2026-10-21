// Thông báo ngắn hiện vài giây ở cuối màn hình.
export class Toast {
  private root: HTMLElement;
  private timer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(message: string, kind: 'info' | 'warn' = 'info', ms = 1800): void {
    this.root.textContent = message;
    this.root.className = `show ${kind}`;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.root.className = '';
    }, ms);
  }
}
