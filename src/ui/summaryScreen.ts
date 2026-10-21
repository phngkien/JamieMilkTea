// Bảng "Hết ngày N": khách, sao, doanh thu, chi phí, lãi, két, bảng xếp hạng nhân viên.
import { LEADERBOARD } from '../config/scoring';
import { RANK_TEXT, SUMMARY_TEXT, TIP_TEXT, UI_TEXT, fill } from '../config/strings';
import { formatMoney, formatRating } from '../core/economy';
import { rankStaff } from '../core/leaderboard';
import type { DaySummary } from '../core/types';
import { esc } from './modal';

const plus = (v: number) => `+${formatMoney(v)}`;
const minus = (v: number) => (v > 0 ? `−${formatMoney(v)}` : formatMoney(0));
const MEDALS = ['🥇', '🥈', '🥉'];

function line(label: string, value: string, cls = ''): string {
  return `<div class="sum-line ${cls}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}

/** Bảng xếp hạng hôm nay: điểm trung bình, số ly, chuỗi hoàn hảo, "Nhân viên xuất sắc". */
function renderRanking(s: DaySummary, localId: string): string {
  const rows = rankStaff(s.staff, s.names, s.excellent, UI_TEXT.staffName);
  if (rows.length === 0) return '';
  const solo = rows.length === 1;
  const items = rows
    .map((r, i) => {
      const me = r.uid === localId;
      const you = me && !solo ? ` <small>${esc(RANK_TEXT.you)}</small>` : '';
      return `<li class="rank-row ${me ? 'me' : ''} ${r.excellent ? 'excellent' : ''}">
        <span class="rank-pos" aria-hidden="true">${solo ? '⭐' : (MEDALS[i] ?? `${i + 1}.`)}</span>
        <span class="rank-name">${r.excellent ? '👑 ' : ''}${esc(r.name)}${you}</span>
        <span class="rank-stat"><b>${esc(fill(RANK_TEXT.points, { n: r.average }))}</b>
          <small>${esc(fill(RANK_TEXT.cups, { n: r.drinks }))} · ${esc(fill(RANK_TEXT.streakShort, { n: r.bestStreak }))}</small></span>
      </li>`;
    })
    .join('');
  const winner = rows.find((r) => r.excellent);
  let note: string;
  if (solo) note = RANK_TEXT.soloHint;
  else if (winner) note = winner.uid === localId ? RANK_TEXT.excellentIsYou : fill(RANK_TEXT.excellentIs, { name: winner.name });
  else note = fill(RANK_TEXT.noExcellent, { n: LEADERBOARD.excellentMinCups });
  return `<section class="sum-block rank-block">
      <h3>${esc(solo ? RANK_TEXT.soloTitle : RANK_TEXT.title)}</h3>
      <ol class="rank-list">${items}</ol>
      <p class="rank-note ${winner ? 'win' : ''}">${esc(note)}</p>
      <p class="hint">${esc(fill(RANK_TEXT.legend, { n: LEADERBOARD.perfectScore }))}</p>
    </section>`;
}

/**
 * `waitText`: chơi chung mà mình không phải chủ phòng → hiện chữ chờ thay cho nút sang ngày mới.
 * `myTips`: tip cá nhân của mình trong ngày (không vào két). `localId`: uid của mình (tô sáng trên bảng xếp hạng).
 */
export function renderSummary(s: DaySummary, waitText: string | null = null, myTips = 0, localId = ''): string {
  const costs = s.ingredients + s.waste + s.rent;
  const stars = s.ratingCount ? formatRating(s.ratingSum, s.ratingCount) : '—';
  return `
    <header class="modal-head summary-head">
      <div class="summary-moon" aria-hidden="true">☾</div>
      <h2>${esc(fill(SUMMARY_TEXT.title, { day: s.day }))}</h2>
    </header>
    <div class="modal-body">
      <div class="sum-tiles">
        <div class="sum-tile"><b>${s.customersServed}</b><span>${esc(SUMMARY_TEXT.customers)}</span></div>
        <div class="sum-tile"><b>${s.unhappy}</b><span>${esc(SUMMARY_TEXT.unhappy)}</span></div>
        <div class="sum-tile"><b>${esc(stars)} ★</b><span>${esc(SUMMARY_TEXT.stars)}</span></div>
      </div>
      ${renderRanking(s, localId)}
      <section class="sum-block">
        ${line(SUMMARY_TEXT.revenue, plus(s.revenue), 'big income')}
        ${line(SUMMARY_TEXT.costs, minus(costs), 'big expense')}
        ${line(fill(SUMMARY_TEXT.ingredients, { n: s.cupsServed }), formatMoney(s.ingredients), 'sub')}
        ${s.wasteCups ? line(fill(SUMMARY_TEXT.waste, { n: s.wasteCups }), formatMoney(s.waste), 'sub') : ''}
        ${line(SUMMARY_TEXT.rent, formatMoney(s.rent), 'sub')}
        ${line(s.profit >= 0 ? SUMMARY_TEXT.profit : SUMMARY_TEXT.loss, s.profit >= 0 ? plus(s.profit) : formatMoney(s.profit), `big ${s.profit >= 0 ? 'profit' : 'expense'}`)}
      </section>
      <section class="sum-block">
        <h3>${esc(SUMMARY_TEXT.cashTitle)}</h3>
        ${line(SUMMARY_TEXT.cashStart, formatMoney(s.cashStart), 'sub')}
        ${line(SUMMARY_TEXT.cashRevenue, plus(s.revenue), 'sub')}
        ${s.restock ? line(SUMMARY_TEXT.cashRestock, minus(s.restock), 'sub') : ''}
        ${s.unlock ? line(SUMMARY_TEXT.cashUnlock, minus(s.unlock), 'sub') : ''}
        ${s.upgrade ? line(SUMMARY_TEXT.cashUpgrade, minus(s.upgrade), 'sub') : ''}
        ${line(SUMMARY_TEXT.cashRent, minus(s.rent), 'sub')}
        ${line(SUMMARY_TEXT.cashEnd, formatMoney(s.cashEnd), 'big cash')}
      </section>
      <section class="sum-block">
        ${line(SUMMARY_TEXT.myTips, plus(myTips), 'big tips')}
        <p class="hint">${esc(TIP_TEXT.yours)} 💰 → 👗</p>
      </section>
    </div>
    <footer class="modal-foot">
      ${
        waitText
          ? `<p class="hint center">${esc(waitText)}</p>`
          : `<button type="button" class="primary next-day" data-action="next">${esc(fill(SUMMARY_TEXT.next, { day: s.day + 1 }))}</button>`
      }
    </footer>`;
}
