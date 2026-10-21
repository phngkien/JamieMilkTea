import { describe, expect, it } from 'vitest';
import { RENT_PER_DAY, START_CASH, stockIdOfCup, stockIdOfTea } from '../src/config/inventory';
import { DAY_LENGTH_MS, MAX_CUSTOMERS, getDayConfig } from '../src/config/progression';
import { clockText, customersForDay, planHostActions } from '../src/core/day';
import { createShopState, reduce } from '../src/core/reducer';
import type { ShopState } from '../src/core/types';
import { makeCustomer, run, SPEC, stateWithCustomer } from './helpers';

describe('day', () => {
  it('đồng hồ chạy từ 08:00 tới 20:00', () => {
    expect(clockText(0)).toBe('08:00');
    expect(clockText(DAY_LENGTH_MS / 2)).toBe('14:00');
    expect(clockText(DAY_LENGTH_MS)).toBe('20:00');
    expect(clockText(DAY_LENGTH_MS * 2)).toBe('20:00');
  });

  it('ngày sau đông khách hơn; sao cao thì thêm khách', () => {
    expect(customersForDay(2, 0, 0)).toBeGreaterThan(customersForDay(1, 0, 0));
    expect(customersForDay(1, 48, 10)).toBe(getDayConfig(1).customers + 2); // 4,8 sao
    expect(customersForDay(1, 42, 10)).toBe(getDayConfig(1).customers + 1); // 4,2 sao
    expect(customersForDay(1, 30, 10)).toBe(getDayConfig(1).customers);
  });

  it('host cho khách vào đúng giờ, không quá số khách tối đa', () => {
    let state = createShopState(5);
    expect(planHostActions(state)).toEqual([]);
    state = reduce(state, { type: 'TICK', dt: state.nextArrivalAt }).state;
    const actions = planHostActions(state);
    expect(actions).toHaveLength(1);
    state = reduce(state, actions[0]).state;
    expect(state.customers).toHaveLength(1);
    expect(state.nextArrivalAt).toBeGreaterThan(state.time);
    for (let i = 1; i < MAX_CUSTOMERS; i++) {
      state = reduce(state, { type: 'CUSTOMER_ARRIVE', customer: makeCustomer(SPEC, { id: `x${i}` }) }).state;
    }
    state = { ...state, time: state.nextArrivalAt + 1 };
    expect(planHostActions(state)).toEqual([]);
  });

  it('hết giờ: ngừng nhận khách, phục vụ nốt rồi mới đóng cửa', () => {
    let state = stateWithCustomer();
    state = reduce(state, { type: 'TICK', dt: DAY_LENGTH_MS }).state;
    // TICK lớn làm khách hết kiên nhẫn; thêm lại một khách để kiểm tra "phục vụ nốt"
    state = { ...state, customers: [makeCustomer(SPEC)] };
    expect(state.phase).toBe('closing');
    expect(planHostActions(state)).toEqual([]); // còn khách thì chưa đóng
    state = { ...state, customers: [] };
    expect(planHostActions(state)).toEqual([{ type: 'END_DAY' }]);
  });

  it('hết khách trong lịch thì đóng cửa sớm', () => {
    const state = { ...createShopState(1), nextCustomerIndex: 10, customersToday: 10 };
    expect(planHostActions(state)).toEqual([{ type: 'END_DAY' }]);
  });

  it('tổng kết ngày: doanh thu, chi phí, lãi, két khớp với những gì đã làm', () => {
    let state: ShopState = { ...stateWithCustomer(), phase: 'prep' };
    const fill = 0.75;
    const r = run(state, [
      { type: 'RESTOCK', item: stockIdOfCup('M') }, // -50k, nhập buổi sáng
      { type: 'OPEN_SHOP' },
      { type: 'PICK_CUP', size: 'L' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'milk', amount: 1.2 }, // tràn
      { type: 'DISCARD_CUP', cupId: 'cup1' },
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup2', tea: 'matcha', amount: fill },
      { type: 'SEAL_CUP', cupId: 'cup2' },
      { type: 'SERVE_CUP', cupId: 'cup2', customerId: 'k1' },
      { type: 'END_DAY' },
    ]);
    state = r.state;
    const ended = r.events.find((e) => e.type === 'dayEnded');
    if (!ended || ended.type !== 'dayEnded') throw new Error('Không thấy dayEnded');
    const s = ended.summary;
    expect(s.day).toBe(1);
    expect(s.revenue).toBe(38000); // matcha M 30k + trân châu trắng 8k
    expect(s.restock).toBe(50_000);
    expect(s.rent).toBe(RENT_PER_DAY);
    expect(s.wasteCups).toBe(1);
    expect(s.waste).toBe(1500 + 5000); // cốc L + 1 phần trà sữa
    expect(s.ingredients).toBe(1000 + 7000); // cốc M + 1 phần matcha
    // Đồ chỉ dùng trong ngày còn thừa thì bỏ: trà (3 sữa, 3 matcha, 4 hồng trà), trân châu, đá
    expect(s.expiredCost).toBe(3 * 5000 + 3 * 7000 + 4 * 4500 + 6 * 1500 + 6 * 2000 + 12 * 500);
    expect(s.expired[stockIdOfTea('milk')]).toBe(3);
    expect(state.stock[stockIdOfTea('milk')]).toBe(0);
    expect(s.profit).toBe(s.revenue - s.ingredients - s.waste - s.expiredCost - s.rent);
    // Két = đầu ngày + bán ly − nhập hàng − mở khóa − tiền thuê
    expect(s.cashEnd).toBe(START_CASH + 38000 - 50_000 - RENT_PER_DAY);
    expect(state.cash).toBe(s.cashEnd);
    expect(state.phase).toBe('closed');
    expect(state.history).toEqual([s]);
    expect(s.customersServed).toBe(1);
  });

  it('đã đóng cửa thì không pha chế được, thời gian ngừng; sang ngày mới giữ két và kho', () => {
    let state = run(createShopState(3), [{ type: 'PICK_CUP', size: 'M' }, { type: 'END_DAY' }]).state;
    expect(state.cups).toHaveLength(0);
    expect(state.today.wasteCups).toBe(1); // ly còn dở lúc đóng cửa tính hao phí
    expect(reduce(state, { type: 'PICK_CUP', size: 'M' }).events[0]).toMatchObject({ reason: 'dayClosed' });
    expect(reduce(state, { type: 'TICK', dt: 5000 }).state.time).toBe(state.time);
    const cash = state.cash;
    const stock = state.stock;
    state = reduce(state, { type: 'START_DAY' }).state;
    expect(state.day).toBe(2);
    expect(state.phase).toBe('prep');
    expect(state.time).toBe(0);
    expect(state.cash).toBe(cash);
    expect(state.stock).toEqual(stock);
    expect(state.today.cashStart).toBe(cash);
    expect(state.today.revenue).toBe(0);
    expect(state.customersToday).toBe(customersForDay(2, state.ratingSum, state.ratingCount));
  });

  it('chỉ sang ngày mới được khi đã đóng cửa', () => {
    expect(reduce(createShopState(1), { type: 'START_DAY' }).events[0]).toMatchObject({ type: 'rejected' });
  });
});
