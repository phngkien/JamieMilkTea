// Thanh HUD cố định phía trên: ngày, tên tiệm, tiền, sao và số lượt đánh giá.
import { SHOP_NAME, UI_TEXT, fill } from '../config/strings';
import { formatMoney, formatRating } from '../core/economy';
import type { ShopState } from '../core/types';

export class Hud {
  private day: HTMLElement;
  private money: HTMLElement;
  private stars: HTMLElement;
  private rating: HTMLElement;
  private lastKey = '';

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="hud-left"><div class="hud-day"></div></div>
      <div class="hud-center">
        <div class="hud-shop"></div>
        <div class="hud-money"></div>
      </div>
      <div class="hud-right">
        <div class="hud-stars"></div>
        <div class="hud-rating"></div>
      </div>`;
    this.day = root.querySelector('.hud-day')!;
    this.money = root.querySelector('.hud-money')!;
    this.stars = root.querySelector('.hud-stars')!;
    this.rating = root.querySelector('.hud-rating')!;
    root.querySelector('.hud-shop')!.textContent = SHOP_NAME;
  }

  update(state: ShopState): void {
    const key = `${state.day}|${state.cash}|${state.ratingSum}|${state.ratingCount}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.day.textContent = fill(UI_TEXT.day, { n: state.day });
    this.money.textContent = formatMoney(state.cash);
    const avg = state.ratingCount ? state.ratingSum / state.ratingCount : 0;
    const full = Math.round(avg);
    this.stars.textContent = '★'.repeat(full) + '☆'.repeat(5 - full);
    this.rating.textContent = state.ratingCount
      ? fill(UI_TEXT.rating, { avg: formatRating(state.ratingSum, state.ratingCount), count: state.ratingCount })
      : UI_TEXT.noRating;
  }

  /** Số tiền nhảy nhẹ khi vừa được cộng. */
  flashMoney(): void {
    this.money.classList.remove('flash');
    void this.money.offsetWidth; // khởi động lại hiệu ứng CSS
    this.money.classList.add('flash');
  }
}
