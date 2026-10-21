// Điều phối màn Tài khoản: giữ tài khoản bằng Google, tạo mã tài khoản, đăng nhập bằng mã trên máy khác.
import type { AuthCredential } from 'firebase/auth';
import { ACCOUNT_TEXT } from '../config/strings';
import type { LinkError } from '../net/cloud';
import { normalizeLoginCode } from '../net/loginCode';
import type { PlayerStore } from '../save/PlayerStore';
import { renderAccount, renderSwitchConfirm, type AccountView } from './accountScreens';
import type { Overlay } from './overlay';

export interface AccountHooks {
  inRoom: () => boolean;
}

const ERROR_TEXT: Record<LinkError | 'badCode', string> = {
  popupBlocked: ACCOUNT_TEXT.popupBlocked,
  cancelled: ACCOUNT_TEXT.cancelled,
  network: ACCOUNT_TEXT.network,
  unsupported: ACCOUNT_TEXT.unsupported,
  notEnabled: ACCOUNT_TEXT.notEnabled,
  other: ACCOUNT_TEXT.failed,
  badCode: ACCOUNT_TEXT.badCode,
};

/** Game đang mở từ màn hình chính (PWA) — popup Google trên iPhone hay hỏng ở chế độ này. */
function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || (window.matchMedia?.('(display-mode: standalone)').matches ?? false);
}

export class AccountController {
  private overlay: Overlay;
  private store: PlayerStore;
  private hooks: AccountHooks;
  private busy = false;
  private error = '';
  private pending: AuthCredential | null = null;

  constructor(overlay: Overlay, store: PlayerStore, hooks: AccountHooks) {
    this.overlay = overlay;
    this.store = store;
    this.hooks = hooks;
  }

  private view(): AccountView {
    return {
      account: this.store.account,
      connecting: this.store.connecting,
      loginCode: this.store.loginCode,
      inRoom: this.hooks.inRoom(),
      standalone: isStandalone(),
      busy: this.busy,
      error: this.error,
    };
  }

  open(): void {
    this.error = '';
    this.overlay.modal.open('account', renderAccount(this.view()), (action) => this.onAction(action), 'main');
    if (!this.store.account) void this.store.startCloud().then(() => this.refresh());
    this.refresh();
  }

  /** Vẽ lại nếu màn Tài khoản đang mở. */
  refresh(): void {
    if (this.overlay.modal.current === 'account' && this.overlay.modal.tag === 'main') {
      this.overlay.modal.update(renderAccount(this.view()));
    }
  }

  private onAction(action: string): void {
    if (action === 'close') this.overlay.modal.close();
    else if (action === 'retry') void this.store.startCloud().then(() => this.refresh());
    // Popup Google phải mở ngay trong lần bấm (không chờ gì trước), Safari mới cho mở
    else if (action === 'google') void this.google();
    else if (action === 'make-code') void this.makeCode();
    else if (action === 'sign-in-code') void this.signInCode();
    else if (action === 'switch-yes') void this.switchAccount();
    else if (action === 'switch-no') {
      this.pending = null;
      this.open();
    }
  }

  private setBusy(on: boolean, error = ''): void {
    this.busy = on;
    this.error = error;
    this.refresh();
  }

  private async google(): Promise<void> {
    const cloud = this.store.cloud;
    if (!cloud || this.busy) return;
    // Gọi ngay (chưa await gì) để popup mở trong cùng lần bấm
    const result = cloud.linkGoogle();
    this.setBusy(true);
    const r = await result;
    if (r.ok) {
      this.store.refreshAccount();
      this.setBusy(false);
      this.overlay.toast.show(ACCOUNT_TEXT.linked);
      return;
    }
    if ('conflict' in r) {
      this.busy = false;
      this.pending = r.conflict;
      this.overlay.modal.open('account', renderSwitchConfirm(), (a) => this.onAction(a), 'switch');
      return;
    }
    this.setBusy(false, ERROR_TEXT[r.error]);
  }

  private async switchAccount(): Promise<void> {
    const cloud = this.store.cloud;
    const credential = this.pending;
    this.pending = null;
    this.open();
    if (!cloud || !credential) return;
    this.setBusy(true);
    const info = await cloud.switchToCredential(credential);
    // Đổi tài khoản → PlayerStore tự đồng bộ dữ liệu của tài khoản mới (onAccountChange)
    this.setBusy(false, info ? '' : ACCOUNT_TEXT.failed);
    if (info) this.overlay.toast.show(ACCOUNT_TEXT.signedIn, 'info', 3000);
  }

  private async makeCode(): Promise<void> {
    const cloud = this.store.cloud;
    if (!cloud || this.busy) return;
    this.setBusy(true);
    const r = await cloud.createLoginCode();
    if (r.ok) {
      this.store.loginCode = r.code;
      this.store.refreshAccount();
      this.setBusy(false);
      return;
    }
    this.setBusy(false, ERROR_TEXT[r.error]);
  }

  private async signInCode(): Promise<void> {
    const cloud = this.store.cloud;
    if (!cloud || this.busy) return;
    const input = document.getElementById('login-code') as HTMLInputElement | null;
    const code = normalizeLoginCode(input?.value ?? '');
    this.setBusy(true);
    const r = await cloud.signInWithCode(code);
    if (r.ok) {
      this.store.loginCode = code;
      this.setBusy(false);
      this.overlay.toast.show(ACCOUNT_TEXT.signedIn, 'info', 3000);
      return;
    }
    this.setBusy(false, ERROR_TEXT[r.error]);
  }
}
