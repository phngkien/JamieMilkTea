// Màn Tài khoản: trạng thái (khách / Google / mã), cảnh báo tài khoản khách, giữ tài khoản, đăng nhập bằng mã.
import { ACCOUNT_TEXT, fill } from '../config/strings';
import type { AccountInfo } from '../net/cloud';
import { formatLoginCode } from '../net/loginCode';
import { esc } from './modal';

export interface AccountView {
  account: AccountInfo | null;
  connecting: boolean;
  loginCode: string | null;
  inRoom: boolean;
  /** Đang mở từ màn hình chính (PWA). */
  standalone: boolean;
  busy: boolean;
  error: string;
}

function status(v: AccountView): string {
  if (!v.account) {
    return v.connecting
      ? `<p class="hint">${esc(ACCOUNT_TEXT.connecting)}</p>`
      : `<p class="warn-box">${esc(ACCOUNT_TEXT.offline)}</p><button type="button" data-action="retry">${esc(ACCOUNT_TEXT.retry)}</button>`;
  }
  const a = v.account;
  const lines: string[] = [];
  if (a.googleEmail) lines.push(`<p class="ok-box">✓ ${esc(fill(ACCOUNT_TEXT.google, { email: a.googleEmail }))}</p>`);
  if (a.hasCode) lines.push(`<p class="ok-box">✓ ${esc(ACCOUNT_TEXT.codeOn)}</p>`);
  if (a.anonymous) lines.push(`<p class="warn-box">⚠ <b>${esc(ACCOUNT_TEXT.guest)}.</b> ${esc(ACCOUNT_TEXT.guestWarning)}</p>`);
  return lines.join('');
}

export function renderAccount(v: AccountView): string {
  const a = v.account;
  const disabled = !a || v.busy || v.inRoom ? 'disabled' : '';
  const code = v.loginCode
    ? `<div class="login-code-box"><span>${esc(ACCOUNT_TEXT.yourCode)}</span><div class="room-code">${esc(formatLoginCode(v.loginCode))}</div>
        <p class="hint">${esc(ACCOUNT_TEXT.codeWarning)}</p></div>`
    : '';
  const google = a?.googleEmail
    ? ''
    : `<button type="button" class="primary big" data-action="google" ${disabled}>G&nbsp; ${esc(ACCOUNT_TEXT.keepGoogle)}</button>
       <p class="hint">${esc(ACCOUNT_TEXT.keepGoogleHint)}</p>`;
  const makeCode = a?.hasCode
    ? code
    : `<button type="button" class="big" data-action="make-code" ${disabled}>🔑 ${esc(ACCOUNT_TEXT.makeCode)}</button>
       <p class="hint">${esc(ACCOUNT_TEXT.makeCodeHint)}</p>`;
  const signIn = `<h3>${esc(ACCOUNT_TEXT.enterCode)}</h3>
    <label class="field"><span>${esc(ACCOUNT_TEXT.codeLabel)}</span>
      <input id="login-code" type="text" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="${esc(ACCOUNT_TEXT.codePlaceholder)}"></label>
    <button type="button" data-action="sign-in-code" ${disabled}>${esc(v.busy ? ACCOUNT_TEXT.connecting : ACCOUNT_TEXT.signIn)}</button>`;
  return `
    <header class="modal-head"><h2>${esc(ACCOUNT_TEXT.title)}</h2></header>
    <div class="modal-body settings-list">
      ${status(v)}
      ${v.standalone && a && !a.googleEmail ? `<p class="hint">${esc(ACCOUNT_TEXT.pwaHint)}</p>` : ''}
      ${v.inRoom ? `<p class="hint">${esc(ACCOUNT_TEXT.inRoom)}</p>` : ''}
      ${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
      ${a ? google + makeCode + signIn : ''}
    </div>
    <footer class="modal-foot">
      <button type="button" class="primary" data-action="close">${esc(ACCOUNT_TEXT.close)}</button>
    </footer>`;
}

/** Hỏi trước khi chuyển sang tài khoản Google đã có tiệm. */
export function renderSwitchConfirm(): string {
  return `
    <header class="modal-head"><h2>${esc(ACCOUNT_TEXT.switchTitle)}</h2></header>
    <div class="modal-body"><p class="confirm-text">${esc(ACCOUNT_TEXT.switchQuestion)}</p></div>
    <footer class="modal-foot two">
      <button type="button" data-action="switch-no">${esc(ACCOUNT_TEXT.switchNo)}</button>
      <button type="button" class="primary" data-action="switch-yes">${esc(ACCOUNT_TEXT.switchYes)}</button>
    </footer>`;
}
