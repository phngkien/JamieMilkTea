// Màn Kho, cũng là màn "Chuẩn bị" buổi sáng: số tồn, hạn dùng, hôm qua khách gọi bao nhiêu,
// nhập gói nhỏ / gói lớn, mở khóa món mới. Buổi sáng có nút "Mở cửa"; trong giờ bán thì là nhập gấp.
import { CREDIT, LOW_STOCK_AT, RUSH, STOCK, UNLOCKS, packOf, stockIdOfTea, stockIdOfTopping, type PackSize, type StockDef } from '../config/inventory';
import { SHOP_TEXT, STOCK_TEXT, fill } from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import { formatMoney } from '../core/economy';
import { canAfford, expiringToday, incomingOf, isUnlocked, restockPrice } from '../core/inventory';
import type { ShopState } from '../core/types';
import { esc } from './modal';

export interface StockView {
  state: ShopState;
  /** Được chi tiền két (nhập hàng, mở khóa). */
  canSpend: boolean;
  /** Được bấm "Mở cửa" (giữ trạm Kho). */
  canOpen: boolean;
}

/** Nguyên liệu có hiện trong danh sách nhập hàng không (món đang khóa thì ẩn). */
function isAvailable(state: ShopState, stockId: string): boolean {
  const tea = UNLOCKS.find((u) => u.kind === 'tea' && stockIdOfTea(u.id) === stockId);
  if (tea) return isUnlocked(state, 'tea', tea.id);
  const topping = UNLOCKS.find((u) => u.kind === 'topping' && stockIdOfTopping(u.id) === stockId);
  if (topping) return isUnlocked(state, 'topping', topping.id);
  return true;
}

/** Khóa để biết khi nào cần vẽ lại màn Kho (tránh vẽ lại mỗi khung hình). */
export function stockScreenKey(v: StockView): string {
  const s = v.state;
  return JSON.stringify([
    s.cash,
    s.debt,
    s.stock,
    s.incoming.length,
    s.phase === 'prep',
    s.unlockedTeas,
    s.unlockedToppings,
    s.day,
    s.upgrades,
    v.canSpend,
    v.canOpen,
  ]);
}

/** Ghi chú hạn dùng của một nguyên liệu. */
function shelfNote(state: ShopState, def: StockDef): string {
  if (def.shelfLife === 0) return STOCK_TEXT.noExpiry;
  if (def.shelfLife === 1) return STOCK_TEXT.expiresToday;
  const soon = expiringToday(state, def.id);
  return soon > 0 ? fill(STOCK_TEXT.expiresSome, { n: soon }) : fill(STOCK_TEXT.keepsDays, { n: def.shelfLife });
}

function buyButton(state: ShopState, def: StockDef, pack: PackSize, canSpend: boolean): string {
  const price = restockPrice(state, def.id, pack);
  const ok = canSpend && canAfford(state, price);
  return `<button type="button" class="pack-${pack}" data-action="restock" data-item="${esc(def.id)}" data-pack="${pack}" ${ok ? '' : 'disabled'}>${esc(
    fill(STOCK_TEXT.restock, { n: packOf(def.id, pack).size, price: formatMoney(price) }),
  )}</button>`;
}

function ingredientRow(state: ShopState, def: StockDef, canSpend: boolean): string {
  const count = state.stock[def.id] ?? 0;
  const level = count === 0 ? 'out' : count <= LOW_STOCK_AT ? 'low' : '';
  const y = state.yesterday;
  const asked = y?.demand[def.id] ?? 0;
  const lost = y?.lost[def.id] ?? 0;
  const history = y
    ? `${asked ? fill(STOCK_TEXT.yesterday, { n: asked }) : STOCK_TEXT.yesterdayNone}${lost ? fill(STOCK_TEXT.yesterdayLost, { n: lost }) : ''}`
    : '';
  const coming = incomingOf(state, def.id);
  const notes = [shelfNote(state, def), history, coming ? fill(STOCK_TEXT.incoming, { n: coming }) : ''].filter(Boolean);
  return `
    <li class="stock-row prep-row ${level}">
      <span class="stock-name">${esc(def.name)}</span>
      <span class="stock-count">${esc(fill(STOCK_TEXT.inStock, { n: count }))}</span>
      <span class="stock-notes ${lost ? 'lost' : ''}">${notes.map(esc).join(' · ')}</span>
      <span class="stock-buy">${buyButton(state, def, 'small', canSpend)}${buyButton(state, def, 'big', canSpend)}</span>
    </li>`;
}

export function renderStockScreen(v: StockView): string {
  const { state, canSpend } = v;
  const prep = state.phase === 'prep';
  const rows = STOCK.filter((s) => isAvailable(state, s.id))
    .map((s) => ingredientRow(state, s, canSpend))
    .join('');

  const locked = UNLOCKS.filter((u) => !isUnlocked(state, u.kind, u.id))
    .map((u) => {
      const name = u.kind === 'tea' ? getTea(u.id).name : getTopping(u.id).name;
      const kind = u.kind === 'tea' ? STOCK_TEXT.tea : STOCK_TEXT.topping;
      const early = state.day < u.minDay;
      const canBuy = canSpend && !early && state.cash >= u.price;
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

  const title = prep ? fill(STOCK_TEXT.prepTitle, { day: state.day }) : STOCK_TEXT.rushTitle;
  const help = prep
    ? state.day === 1 && !state.yesterday
      ? STOCK_TEXT.prepFirstDay
      : STOCK_TEXT.prepHelp
    : fill(STOCK_TEXT.rushHelp, { factor: String(RUSH.priceFactor).replace('.', ','), s: RUSH.deliveryMs / 1000 });
  const prepTiles = prep
    ? `<div class="sum-tiles prep-tiles">
        <div class="sum-tile"><b>${state.customersToday}</b><span>${esc(STOCK_TEXT.expected)}</span></div>
        <div class="sum-tile"><b>${esc(formatMoney(state.cash))}</b><span>${esc(SHOP_TEXT.cash)}</span></div>
      </div>`
    : '';
  const debt = state.debt > 0 ? `<p class="warn-box">${esc(fill(STOCK_TEXT.debt, { debt: formatMoney(state.debt) }))}</p>` : '';
  let foot: string;
  if (prep && v.canOpen) foot = `<button type="button" class="primary" data-action="open">${esc(STOCK_TEXT.open)}</button>`;
  else if (prep) foot = `<p class="hint center">${esc(STOCK_TEXT.waitOpen)}</p><button type="button" data-action="close">${esc(STOCK_TEXT.close)}</button>`;
  else foot = `<button type="button" class="primary" data-action="close">${esc(STOCK_TEXT.close)}</button>`;

  return `
    <header class="modal-head">
      <h2>${esc(title)}</h2>
      ${prep ? '' : `<div class="modal-cash">${esc(fill(STOCK_TEXT.cash, { cash: formatMoney(state.cash) }))}</div>`}
    </header>
    <div class="modal-body">
      ${prepTiles}
      <p class="hint">${esc(help)}</p>
      ${debt}
      ${canSpend ? '' : `<p class="hint">${esc(SHOP_TEXT.ownerOnly)}</p>`}
      <h3>${esc(STOCK_TEXT.ingredients)}</h3>
      <ul class="stock-list">${rows}</ul>
      <p class="hint">${esc(fill(STOCK_TEXT.credit, { limit: formatMoney(CREDIT.limit) }))}</p>
      ${locked ? `<h3>${esc(STOCK_TEXT.newItems)}</h3><p class="hint">${esc(STOCK_TEXT.unlockGift)}</p><ul class="stock-list">${locked}</ul>` : ''}
    </div>
    <footer class="modal-foot">${foot}</footer>`;
}
