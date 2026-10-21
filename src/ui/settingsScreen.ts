// Cài đặt: âm thanh, nhạc nền, giảm chuyển động, bật lại hướng dẫn, chơi lại từ đầu (xác nhận hai lần ngay trong game).
import { SETTINGS_TEXT } from '../config/strings';
import type { Settings } from '../save/schema';
import { esc } from './modal';

function toggle(action: string, label: string, on: boolean): string {
  return `<button type="button" class="toggle ${on ? 'on' : ''}" data-action="${action}">
    <span>${esc(label)}</span><b>${esc(on ? SETTINGS_TEXT.on : SETTINGS_TEXT.off)}</b>
  </button>`;
}

/** step 0: màn chính · 1: hỏi lần 1 · 2: hỏi lần 2. */
export function renderSettings(step: 0 | 1 | 2, settings: Settings): string {
  if (step > 0) {
    const question = step === 1 ? SETTINGS_TEXT.resetConfirm1 : SETTINGS_TEXT.resetConfirm2;
    const yes = step === 1 ? SETTINGS_TEXT.resetYes1 : SETTINGS_TEXT.resetYes2;
    return `
      <header class="modal-head"><h2>${esc(SETTINGS_TEXT.reset)}</h2></header>
      <div class="modal-body"><p class="confirm-text">${esc(question)}</p></div>
      <footer class="modal-foot two">
        <button type="button" data-action="cancel">${esc(SETTINGS_TEXT.cancel)}</button>
        <button type="button" class="danger" data-action="${step === 1 ? 'confirm1' : 'confirm2'}">${esc(yes)}</button>
      </footer>`;
  }
  return `
    <header class="modal-head"><h2>${esc(SETTINGS_TEXT.title)}</h2></header>
    <div class="modal-body settings-list">
      ${toggle('sound', SETTINGS_TEXT.sound, !settings.muted)}
      ${toggle('music', SETTINGS_TEXT.music, settings.musicOn)}
      ${toggle('motion', SETTINGS_TEXT.reducedMotion, settings.reducedMotion)}
      <button type="button" data-action="tutorial">${esc(SETTINGS_TEXT.tutorial)}</button>
      <button type="button" class="danger-outline" data-action="reset">${esc(SETTINGS_TEXT.reset)}</button>
      <p class="hint">${esc(SETTINGS_TEXT.savedLocally)}</p>
    </div>
    <footer class="modal-foot">
      <button type="button" class="primary" data-action="close">${esc(SETTINGS_TEXT.close)}</button>
    </footer>`;
}
