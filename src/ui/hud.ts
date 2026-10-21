// Thanh HUD cố định phía trên: cài đặt, ngày + đồng hồ, tên tiệm + tiền két, sao + số lượt đánh giá.
import { ROOM_TEXT, SHOP_NAME, STOCK_TEXT, UI_TEXT, fill } from '../config/strings';
import { clockText } from '../core/day';
import { formatMoney, formatRating } from '../core/economy';
import type { ShopState } from '../core/types';

export class Hud {
  private day: HTMLElement;
  private clock: HTMLElement;
  private money: HTMLElement;
  private stars: HTMLElement;
  private rating: HTMLElement;
  private lastKey = '';

  private sound: HTMLButtonElement;

  private invite: HTMLButtonElement;

  private shop: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    onSettings: () => void,
    onStock: () => void,
    onSound: () => void,
    onInvite: () => void,
    onShop: () => void,
  ) {
    root.innerHTML = `
      <div class="hud-left">
        <button type="button" class="hud-btn hud-settings" aria-label="Cài đặt">⚙</button>
        <button type="button" class="hud-btn hud-invite" aria-label="Mời bạn"></button>
        <button type="button" class="hud-btn hud-stock"></button>
        <div class="hud-daybox">
          <div class="hud-day"></div>
          <div class="hud-clock"></div>
        </div>
      </div>
      <div class="hud-center">
        <button type="button" class="hud-shop" aria-label="Tiệm của tôi"></button>
        <div class="hud-money"></div>
      </div>
      <div class="hud-right">
        <div class="hud-rating-box">
          <div class="hud-stars"></div>
          <div class="hud-rating"></div>
        </div>
        <button type="button" class="hud-btn hud-sound" aria-label="Âm thanh"></button>
      </div>`;
    this.day = root.querySelector('.hud-day')!;
    this.clock = root.querySelector('.hud-clock')!;
    this.money = root.querySelector('.hud-money')!;
    this.stars = root.querySelector('.hud-stars')!;
    this.rating = root.querySelector('.hud-rating')!;
    this.shop = root.querySelector<HTMLButtonElement>('.hud-shop')!;
    this.shop.textContent = SHOP_NAME;
    // Cả khối giữa (tên tiệm + tiền két) là nút mở "Tiệm của tôi" — vùng chạm đủ lớn trên điện thoại
    root.querySelector('.hud-center')!.addEventListener('click', onShop);
    const stock = root.querySelector<HTMLButtonElement>('.hud-stock')!;
    stock.textContent = STOCK_TEXT.title;
    stock.addEventListener('click', onStock);
    root.querySelector('.hud-settings')!.addEventListener('click', onSettings);
    this.sound = root.querySelector<HTMLButtonElement>('.hud-sound')!;
    this.sound.addEventListener('click', onSound);
    this.invite = root.querySelector<HTMLButtonElement>('.hud-invite')!;
    this.invite.addEventListener('click', onInvite);
    this.setRoom(null);
  }

  update(state: ShopState): void {
    const clock = clockText(state.time);
    const key = `${state.day}|${clock}|${state.cash}|${state.ratingSum}|${state.ratingCount}|${state.phase}|${state.shopName}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.shop.textContent = `${state.shopName} ›`;
    this.day.textContent = fill(UI_TEXT.day, { n: state.day });
    this.clock.textContent = `🕒 ${clock}`;
    this.clock.classList.toggle('closing', state.phase !== 'open');
    this.money.textContent = formatMoney(state.cash);
    this.money.classList.toggle('negative', state.cash < 0);
    const avg = state.ratingCount ? state.ratingSum / state.ratingCount : 0;
    const full = Math.round(avg);
    this.stars.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
    this.rating.textContent = state.ratingCount
      ? fill(UI_TEXT.rating, { avg: formatRating(state.ratingSum, state.ratingCount), count: state.ratingCount })
      : UI_TEXT.noRating;
  }

  /** Nút mời bạn: chơi một mình hiện 👥, đang trong phòng hiện mã phòng. */
  setRoom(code: string | null): void {
    this.invite.textContent = code ?? '👥';
    this.invite.classList.toggle('in-room', code !== null);
    this.invite.title = code ? code : ROOM_TEXT.invite;
  }

  /** Biểu tượng loa: bật / tắt tiếng. */
  setSound(on: boolean): void {
    this.sound.textContent = on ? '🔊' : '🔇';
    this.sound.classList.toggle('off', !on);
  }

  /** Số tiền nhảy nhẹ khi vừa được cộng. */
  flashMoney(): void {
    this.money.classList.remove('flash');
    void this.money.offsetWidth; // khởi động lại hiệu ứng CSS
    this.money.classList.add('flash');
  }
}
