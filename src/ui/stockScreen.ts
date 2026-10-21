// Màn Kho: số tồn, nhập hàng, mở khóa món mới. Tiệm vẫn chạy trong lúc mở màn này.
import { LOW_STOCK_AT, STOCK, UNLOCKS, stockIdOfTea, stockIdOfTopping } from '../config/inventory';
import { STOCK_TEXT, fill } from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import { formatMoney } from '../core/economy';
import { isUnlocked, restockPrice } from '../core/inventory';
import type { ShopState } from '../core/types';
import { esc } from './modal';

/** Nguyên liệu có hiện trong danh sách nhập hàng không (món đang khóa thì ẩn). */
function isAvailable(state: ShopState, stockId: string): boolean {
  const tea = UNLOCKS.find((u) => u.kind === 'tea' && stockIdOfTea(u.id) === stockId);
  if (tea) return isUnlocked(state, 'tea', tea.id);
  const topping = UNLOCKS.find((u) => u.kind === 'topping' && stockIdOfTopping(u.id) === stockId);
  if (topping) return isUnlocked(state, 'topping', topping.id);
  return true;
}

/** Khóa để biết khi nào cần vẽ lại màn Kho (tránh vẽ lại mỗi khung hình). */
export function stockScreenKey(state: ShopState): string {
  return JSON.stringify([state.cash, state.stock, state.unlockedTeas, state.unlockedToppings, state.day, state.upgrades]);
}

export function renderStockScreen(state: ShopState): string {
  const rows = STOCK.filter((s) => isAvailable(state, s.id))
    .map((s) => {
      const count = state.stock[s.id] ?? 0;
      const level = count === 0 ? 'out' : count <= LOW_STOCK_AT ? 'low' : '';
      const price = restockPrice(state, s.id);
      const canBuy = state.cash >= price;
      return `
        <li class="stock-row ${level}">
          <span class="stock-name">${esc(s.name)}</span>
          <span class="stock-count">${esc(fill(STOCK_TEXT.inStock, { n: count }))}</span>
          <button type="button" data-action="restock" data-item="${esc(s.id)}" ${canBuy ? '' : 'disabled'}>
            ${esc(fill(STOCK_TEXT.restock, { n: s.packSize, price: formatMoney(price) }))}
          </button>
        </li>`;
    })
    .join('');

  const locked = UNLOCKS.filter((u) => !isUnlocked(state, u.kind, u.id))
    .map((u) => {
      const name = u.kind === 'tea' ? getTea(u.id).name : getTopping(u.id).name;
      const kind = u.kind === 'tea' ? STOCK_TEXT.tea : STOCK_TEXT.topping;
      const early = state.day < u.minDay;
      const canBuy = !early && state.cash >= u.price;
      const button = early
        ? `<span class="stock-wait">${esc(fill(STOCK_TEXT.fromDay, { day: u.minDay }))}</span>`
        : `<button type="button" class="unlock" data-action="unlock" data-kind="${u.kind}" data-id="${esc(u.id)}" ${
            canBuy ? '' : 'disabled'
          }>${esc(fill(STOCK_TEXT.unlock, { price: formatMoney(u.price) }))}</button>`;
      return `
        <li class="stock-row locked">
          <span class="stock-name">🔒 ${esc(name)}</span>
          <span class="stock-count">${esc(kind)}</span>
          ${button}
        </li>`;
    })
    .join('');

  return `
    <header class="modal-head">
      <h2>${esc(STOCK_TEXT.title)}</h2>
      <div class="modal-cash">${esc(fill(STOCK_TEXT.cash, { cash: formatMoney(state.cash) }))}</div>
    </header>
    <div class="modal-body">
      <h3>${esc(STOCK_TEXT.ingredients)}</h3>
      <ul class="stock-list">${rows}</ul>
      ${locked ? `<h3>${esc(STOCK_TEXT.newItems)}</h3><p class="hint">${esc(STOCK_TEXT.unlockGift)}</p><ul class="stock-list">${locked}</ul>` : ''}
    </div>
    <footer class="modal-foot">
      <button type="button" class="primary" data-action="close">${esc(STOCK_TEXT.close)}</button>
    </footer>`;
}
