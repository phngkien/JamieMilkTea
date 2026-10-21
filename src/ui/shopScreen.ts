// Màn "Tiệm của tôi": tên tiệm, ngày, két, đánh giá, nâng cấp và trang trí (mua bằng két),
// bảng thành tích của tiệm, thành tích của mình, các nút đi tiếp.
import { LEADERBOARD } from '../config/scoring';
import { RANK_TEXT, SHOP_NAME_MAX, SHOP_TEXT, STATION_NAMES, fill } from '../config/strings';
import { UPGRADES, type UpgradeDef } from '../config/upgrades';
import { formatMoney, formatRating } from '../core/economy';
import { fameBoard, type FameHolder } from '../core/leaderboard';
import type { CupStation, Profile, ShopState } from '../core/types';
import { esc } from './modal';

export interface ShopScreenView {
  state: ShopState;
  /** Mình là chủ tiệm đang chơi. */
  isOwner: boolean;
  canSpend: boolean;
  /** Đang dùng tài khoản khách (hiện cảnh báo). */
  guest: boolean;
  inRoom: boolean;
  profile: Profile;
}

const CUP_STATIONS: CupStation[] = ['tea', 'topping', 'cashier'];

function fameLine(label: string, holder: FameHolder | null, value: (h: FameHolder) => string, empty: string): string {
  const shown = holder ? `${esc(holder.name || '?')} · ${esc(value(holder))}` : `<small>${esc(empty)}</small>`;
  return `<div class="sum-line sub fame-line"><span>${esc(label)}</span><b>${shown}</b></div>`;
}

/** Bảng thành tích của tiệm: ai Xuất sắc nhiều nhất, chuỗi dài nhất, giỏi nhất từng trạm, số ngày công. */
function renderFame(state: ShopState): string {
  const members = Object.values(state.fame).sort((a, b) => b.excellent - a.excellent || b.days - a.days);
  if (members.length === 0) {
    return `<section class="sum-block"><h3>${esc(RANK_TEXT.fameTitle)}</h3><p class="hint">${esc(RANK_TEXT.fameEmpty)}</p></section>`;
  }
  const board = fameBoard(state.fame);
  const stations = CUP_STATIONS.map((st) =>
    fameLine(
      fill(RANK_TEXT.fameBestAt, { station: STATION_NAMES[st] }),
      board.bestAt[st],
      (h) => fill(RANK_TEXT.fameAvg, { n: h.value }),
      fill(RANK_TEXT.fameNobody, { n: LEADERBOARD.stationMinCups }),
    ),
  ).join('');
  const people = members
    .map(
      (e) => `<li class="rank-row"><span class="rank-name">${esc(e.name || '?')}</span>
        <span class="rank-stat"><b>👑 ${e.excellent}</b><small>${esc(fill(RANK_TEXT.fameDays, { n: e.days }))}</small></span></li>`,
    )
    .join('');
  return `<section class="sum-block rank-block">
      <h3>${esc(RANK_TEXT.fameTitle)}</h3>
      ${fameLine(RANK_TEXT.fameExcellent, board.mostExcellent, (h) => fill(RANK_TEXT.fameTimes, { n: h.value }), '—')}
      ${fameLine(RANK_TEXT.fameStreak, board.longestStreak, (h) => fill(RANK_TEXT.fameCups, { n: h.value }), '—')}
      ${stations}
      <ol class="rank-list">${people}</ol>
    </section>`;
}

/** Thành tích lâu dài của mình (đi theo profile sang mọi tiệm). */
function renderMyStats(p: Profile): string {
  const stations = CUP_STATIONS.map((st) => {
    const s = p.stats[st];
    const text = s.cups
      ? fill(RANK_TEXT.myStation, { station: STATION_NAMES[st], cups: s.cups, avg: Math.round(s.scoreSum / s.cups) })
      : fill(RANK_TEXT.myNone, { station: STATION_NAMES[st] });
    return `<div class="sum-line sub"><span>${esc(text)}</span></div>`;
  }).join('');
  return `<section class="sum-block">
      <h3>${esc(RANK_TEXT.myTitle)}</h3>
      <div class="sum-line"><span>${esc(fill(RANK_TEXT.myExcellent, { n: p.excellent }))}</span></div>
      <div class="sum-line"><span>${esc(fill(RANK_TEXT.myStreak, { n: p.bestStreak }))}</span></div>
      ${stations}
    </section>`;
}

function itemRow(u: UpgradeDef, state: ShopState, canSpend: boolean): string {
  const owned = (u.kind === 'upgrade' ? state.upgrades : state.decor).includes(u.id);
  const early = state.day < u.minDay;
  let action: string;
  if (owned) action = `<span class="stock-wait owned">${esc(SHOP_TEXT.owned)}</span>`;
  else if (early) action = `<span class="stock-wait">${esc(fill(SHOP_TEXT.fromDay, { day: u.minDay }))}</span>`;
  else {
    const ok = canSpend && state.cash >= u.price;
    action = `<button type="button" class="unlock" data-action="buy-upgrade" data-id="${esc(u.id)}" ${ok ? '' : 'disabled'}>${esc(
      fill(SHOP_TEXT.buy, { price: formatMoney(u.price) }),
    )}</button>`;
  }
  return `<li class="stock-row upgrade-row ${owned ? 'owned' : ''}">
    <span class="stock-name"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span> ${esc(u.name)}</span>
    <span class="stock-count upgrade-desc">${esc(u.desc)}</span>
    ${action}
  </li>`;
}

export function shopScreenKey(v: ShopScreenView): string {
  const s = v.state;
  const p = v.profile;
  return JSON.stringify([
    s.shopName,
    s.day,
    s.cash,
    s.ratingCount,
    s.upgrades,
    s.decor,
    s.fame,
    v.canSpend,
    v.guest,
    v.isOwner,
    p.excellent,
    p.bestStreak,
    p.stats,
  ]);
}

export function renderShopScreen(v: ShopScreenView): string {
  const s = v.state;
  const rating = s.ratingCount ? `${formatRating(s.ratingSum, s.ratingCount)} ★ · ${s.ratingCount}` : SHOP_TEXT.noRating;
  const list = (kind: UpgradeDef['kind']) =>
    UPGRADES.filter((u) => u.kind === kind)
      .map((u) => itemRow(u, s, v.canSpend))
      .join('');
  const nameBlock = v.isOwner
    ? `<label class="field"><span>${esc(SHOP_TEXT.name)}</span>
        <span class="field-row"><input id="shop-name" type="text" maxlength="${SHOP_NAME_MAX}" value="${esc(s.shopName)}">
        <button type="button" data-action="rename">${esc(SHOP_TEXT.rename)}</button></span></label>`
    : `<p class="shop-name-big">${esc(s.shopName)}</p><p class="hint">${esc(SHOP_TEXT.friendHint)}</p>`;
  return `
    <header class="modal-head"><h2>${esc(v.isOwner ? SHOP_TEXT.title : SHOP_TEXT.friendTitle)}</h2></header>
    <div class="modal-body">
      ${v.guest && v.isOwner ? `<p class="warn-box">${esc(SHOP_TEXT.guestWarning)}</p>` : ''}
      ${nameBlock}
      <div class="sum-tiles">
        <div class="sum-tile"><b>${s.day}</b><span>${esc(SHOP_TEXT.day)}</span></div>
        <div class="sum-tile"><b>${esc(formatMoney(s.cash))}</b><span>${esc(SHOP_TEXT.cash)}</span></div>
        <div class="sum-tile"><b>${esc(rating)}</b><span>${esc(SHOP_TEXT.rating)}</span></div>
      </div>
      ${v.canSpend ? '' : `<p class="hint">${esc(SHOP_TEXT.ownerOnly)}</p>`}
      <h3>${esc(SHOP_TEXT.upgrades)}</h3>
      <ul class="stock-list">${list('upgrade')}</ul>
      <h3>${esc(SHOP_TEXT.decor)}</h3>
      <ul class="stock-list">${list('decor')}</ul>
      ${renderFame(s)}
      ${renderMyStats(v.profile)}
      <div class="shop-links">
        <button type="button" data-action="wardrobe">👗 ${esc(SHOP_TEXT.wardrobe)}</button>
        <button type="button" data-action="account">👤 ${esc(SHOP_TEXT.account)}</button>
        ${v.inRoom ? '' : `<button type="button" data-action="room">👥 ${esc(SHOP_TEXT.openRoom)}</button>`}
      </div>
    </div>
    <footer class="modal-foot">
      <button type="button" class="primary" data-action="close">${esc(SHOP_TEXT.close)}</button>
    </footer>`;
}
