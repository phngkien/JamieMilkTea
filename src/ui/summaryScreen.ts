// Bảng "Hết ngày N": khách, sao, doanh thu, chi phí, lãi, két.
import { SUMMARY_TEXT, TIP_TEXT, fill } from '../config/strings';
import { formatMoney, formatRating } from '../core/economy';
import type { DaySummary } from '../core/types';
import { esc } from './modal';

const plus = (v: number) => `+${formatMoney(v)}`;
const minus = (v: number) => (v > 0 ? `−${formatMoney(v)}` : formatMoney(0));

function line(label: string, value: string, cls = ''): string {
  return `<div class="sum-line ${cls}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
}

/**
 * `waitText`: chơi chung mà mình không phải chủ phòng → hiện chữ chờ thay cho nút sang ngày mới.
 * `myTips`: tip cá nhân của mình trong ngày (không vào két).
 */
export function renderSummary(s: DaySummary, waitText: string | null = null, myTips = 0): string {
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
